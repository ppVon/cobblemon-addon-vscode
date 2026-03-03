import * as vscode from 'vscode';
import {
  findNodeAtLocation,
  findNodeAtOffset,
  getNodePath,
  getLocation,
  modify,
  parse,
  parseTree,
  type EditResult,
  type Node as JsonNode,
  type ParseError,
} from 'jsonc-parser';
import { type CobblemonSchemaEngine } from '../schema/schema-engine';

const JSON_PARSE_OPTIONS = {
  allowEmptyContent: false,
  allowTrailingComma: true,
  disallowComments: false,
};

export function registerJsonSchemaAssistProviders(
  context: vscode.ExtensionContext,
  engine: CobblemonSchemaEngine
): void {
  const selector: vscode.DocumentSelector = [
    { language: 'json', scheme: 'file' },
    { language: 'jsonc', scheme: 'file' },
  ];

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      selector,
      new SchemaKeyCompletionProvider(engine),
      '"'
    ),
    vscode.languages.registerCodeActionsProvider(
      selector,
      new SchemaQuickFixProvider(engine),
      {
        providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
      }
    )
  );
}

class SchemaKeyCompletionProvider implements vscode.CompletionItemProvider {
  constructor(private readonly engine: CobblemonSchemaEngine) {}

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] {
    const resolution = this.engine.getSchemaForPath(document.uri.fsPath);
    if (!resolution) {
      return [];
    }

    const text = document.getText();
    const offset = document.offsetAt(position);
    const location = getLocation(text, offset);
    if (!location.isAtPropertyKey) {
      return [];
    }

    const objectPath = [...location.path];
    const currentKey = typeof objectPath[objectPath.length - 1] === 'string'
      ? (objectPath.pop() as string)
      : '';

    const rootNode = parseTree(text, [], JSON_PARSE_OPTIONS);
    if (!rootNode) {
      return [];
    }

    const objectNode = findNodeAtLocation(rootNode, objectPath);
    if (!objectNode || objectNode.type !== 'object') {
      return [];
    }

    const existingKeys = this.readExistingObjectKeys(objectNode);
    const suggestions = this.engine.getObjectPropertySuggestions(resolution.schemaPath, objectPath);
    if (suggestions.length === 0) {
      return [];
    }

    const keyNode = this.findPropertyKeyNodeAtOffset(rootNode, offset);
    const replacementRange = keyNode
      ? new vscode.Range(
        document.positionAt(keyNode.offset + 1),
        document.positionAt(keyNode.offset + Math.max(1, keyNode.length - 1))
      )
      : undefined;
    const inQuotedKey = !!keyNode;

    const items: vscode.CompletionItem[] = [];
    for (const suggestion of suggestions) {
      if (existingKeys.has(suggestion.key) && suggestion.key !== currentKey) {
        continue;
      }

      const item = new vscode.CompletionItem(suggestion.key, vscode.CompletionItemKind.Property);
      item.insertText = inQuotedKey ? suggestion.key : `"${suggestion.key}"`;
      item.detail = suggestion.required ? 'required property' : 'optional property';
      item.sortText = `${suggestion.required ? '0' : '1'}-${suggestion.key}`;
      item.filterText = suggestion.key;
      if (suggestion.description) {
        item.documentation = new vscode.MarkdownString(suggestion.description);
      }
      if (suggestion.deprecated) {
        item.tags = [vscode.CompletionItemTag.Deprecated];
      }
      if (replacementRange) {
        item.range = replacementRange;
      }

      items.push(item);
    }

    return items;
  }

  private readExistingObjectKeys(objectNode: { children?: ReadonlyArray<{ children?: ReadonlyArray<{ value?: unknown }> }> }): Set<string> {
    const keys = new Set<string>();
    const children = objectNode.children ?? [];
    for (const propertyNode of children) {
      const keyNode = propertyNode.children?.[0];
      if (keyNode && typeof keyNode.value === 'string') {
        keys.add(keyNode.value);
      }
    }
    return keys;
  }

  private findPropertyKeyNodeAtOffset(rootNode: ReturnType<typeof parseTree>, offset: number) {
    if (!rootNode) {
      return undefined;
    }

    const candidate = findNodeAtOffset(rootNode, Math.max(0, offset - 1), true)
      ?? findNodeAtOffset(rootNode, offset, true);
    if (!candidate || candidate.type !== 'string' || !candidate.parent || candidate.parent.type !== 'property') {
      return undefined;
    }

    const keyNode = candidate.parent.children?.[0];
    return keyNode && keyNode === candidate ? candidate : undefined;
  }
}

class SchemaQuickFixProvider implements vscode.CodeActionProvider {
  constructor(private readonly engine: CobblemonSchemaEngine) {}

  provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const resolution = this.engine.getSchemaForPath(document.uri.fsPath);
    if (!resolution) {
      return [];
    }

    const text = document.getText();
    const parseErrors: ParseError[] = [];
    const value = parse(text, parseErrors, JSON_PARSE_OPTIONS);
    if (parseErrors.length > 0) {
      return [];
    }
    const rootNode = parseTree(text, [], JSON_PARSE_OPTIONS);
    if (!rootNode) {
      return [];
    }

    const formattingOptions = readFormattingOptions(document);
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== 'cobblemon-schema-tools') {
        continue;
      }

      const missingMatch = diagnostic.message.match(/^Missing required property '([^']+)'\.$/);
      if (missingMatch) {
        const objectPath = resolveObjectPathFromDiagnostic(rootNode, document, diagnostic);
        if (!objectPath) {
          continue;
        }

        const requiredAction = this.createAddMissingPropertyAction(
          document,
          diagnostic,
          text,
          resolution.schemaPath,
          objectPath,
          missingMatch[1],
          formattingOptions
        );
        if (requiredAction) {
          actions.push(requiredAction);
        }
      }

      const unknownMatch = diagnostic.message.match(/^Unknown property '([^']+)'\.$/);
      if (unknownMatch) {
        const objectPath = resolveObjectPathFromDiagnostic(rootNode, document, diagnostic);
        if (!objectPath) {
          continue;
        }

        const removeAction = this.createRemoveUnknownPropertyAction(
          document,
          diagnostic,
          text,
          objectPath,
          unknownMatch[1],
          formattingOptions
        );
        if (removeAction) {
          actions.push(removeAction);
        }
      }

      const typeMatch = diagnostic.message.match(/^Expected type '([^']+)'\.$/);
      if (typeMatch) {
        const valuePath = resolveValuePathFromDiagnostic(rootNode, document, diagnostic);
        if (!valuePath) {
          continue;
        }

        const convertAction = this.createTypeConversionAction(
          document,
          diagnostic,
          text,
          value,
          valuePath,
          typeMatch[1],
          formattingOptions
        );
        if (convertAction) {
          actions.push(convertAction);
        }
      }
    }

    return actions;
  }

  private createAddMissingPropertyAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    documentText: string,
    schemaPath: string,
    objectPath: Array<string | number>,
    propertyName: string,
    formattingOptions: { insertSpaces: boolean; tabSize: number; eol: string }
  ): vscode.CodeAction | undefined {
    const value = this.engine.getPropertyPlaceholder(schemaPath, objectPath, propertyName, { shallowContainers: true });
    const edits = modify(documentText, [...objectPath, propertyName], value, { formattingOptions });
    if (edits.length === 0) {
      return undefined;
    }

    const action = new vscode.CodeAction(
      `Add missing property '${propertyName}'`,
      vscode.CodeActionKind.QuickFix
    );
    action.diagnostics = [diagnostic];
    action.edit = asWorkspaceEdit(document, edits);
    return action;
  }

  private createRemoveUnknownPropertyAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    documentText: string,
    objectPath: Array<string | number>,
    propertyName: string,
    formattingOptions: { insertSpaces: boolean; tabSize: number; eol: string }
  ): vscode.CodeAction | undefined {
    const edits = modify(documentText, [...objectPath, propertyName], undefined, { formattingOptions });
    if (edits.length === 0) {
      return undefined;
    }

    const action = new vscode.CodeAction(
      `Remove unknown property '${propertyName}'`,
      vscode.CodeActionKind.QuickFix
    );
    action.diagnostics = [diagnostic];
    action.edit = asWorkspaceEdit(document, edits);
    return action;
  }

  private createTypeConversionAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    documentText: string,
    rootValue: unknown,
    path: Array<string | number>,
    expectedType: string,
    formattingOptions: { insertSpaces: boolean; tabSize: number; eol: string }
  ): vscode.CodeAction | undefined {
    const current = getValueAtPath(rootValue, path);
    const converted = convertValueToExpectedType(current, expectedType);
    if (!converted.changed) {
      return undefined;
    }

    const edits = modify(documentText, path, converted.value, { formattingOptions });
    if (edits.length === 0) {
      return undefined;
    }

    const action = new vscode.CodeAction(
      `Convert value to ${expectedType}`,
      vscode.CodeActionKind.QuickFix
    );
    action.diagnostics = [diagnostic];
    action.edit = asWorkspaceEdit(document, edits);
    return action;
  }
}

function readFormattingOptions(document: vscode.TextDocument): { insertSpaces: boolean; tabSize: number; eol: string } {
  const editorConfig = vscode.workspace.getConfiguration('editor', document.uri);
  const rawTabSize = editorConfig.get<number | string>('tabSize', 2);
  const rawInsertSpaces = editorConfig.get<boolean | 'auto'>('insertSpaces', true);

  const tabSize = typeof rawTabSize === 'number' && Number.isFinite(rawTabSize) ? rawTabSize : 2;
  const insertSpaces = typeof rawInsertSpaces === 'boolean' ? rawInsertSpaces : true;
  const eol = document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
  return { insertSpaces, tabSize, eol };
}

function asWorkspaceEdit(document: vscode.TextDocument, edits: EditResult): vscode.WorkspaceEdit {
  const workspaceEdit = new vscode.WorkspaceEdit();
  for (const edit of edits) {
    const start = document.positionAt(edit.offset);
    const end = document.positionAt(edit.offset + edit.length);
    workspaceEdit.replace(document.uri, new vscode.Range(start, end), edit.content);
  }
  return workspaceEdit;
}

function resolveObjectPathFromDiagnostic(
  rootNode: JsonNode,
  document: vscode.TextDocument,
  diagnostic: vscode.Diagnostic
): Array<string | number> | undefined {
  const node = findNodeAtDiagnosticStart(rootNode, document, diagnostic);
  if (!node) {
    return undefined;
  }

  if (node.type === 'object') {
    return getNodePath(node);
  }
  if (node.type === 'property') {
    return node.parent?.type === 'object' ? getNodePath(node.parent) : undefined;
  }
  if (node.parent?.type === 'object') {
    return getNodePath(node.parent);
  }
  if (node.parent?.type === 'property' && node.parent.parent?.type === 'object') {
    return getNodePath(node.parent.parent);
  }
  return undefined;
}

function resolveValuePathFromDiagnostic(
  rootNode: JsonNode,
  document: vscode.TextDocument,
  diagnostic: vscode.Diagnostic
): Array<string | number> | undefined {
  const node = findNodeAtDiagnosticStart(rootNode, document, diagnostic);
  if (!node) {
    return undefined;
  }

  if (node.type === 'property') {
    const propertyValue = node.children?.[1];
    return propertyValue ? getNodePath(propertyValue) : undefined;
  }

  if (node.type === 'string' && node.parent?.type === 'property') {
    const keyNode = node.parent.children?.[0];
    if (keyNode === node) {
      const propertyValue = node.parent.children?.[1];
      return propertyValue ? getNodePath(propertyValue) : undefined;
    }
  }

  return getNodePath(node);
}

function findNodeAtDiagnosticStart(
  rootNode: JsonNode,
  document: vscode.TextDocument,
  diagnostic: vscode.Diagnostic
): JsonNode | undefined {
  const offset = document.offsetAt(diagnostic.range.start);
  return findNodeAtOffset(rootNode, offset, true)
    ?? findNodeAtOffset(rootNode, Math.max(0, offset - 1), true);
}

function getValueAtPath(root: unknown, path: Array<string | number>): unknown {
  let current: unknown = root;
  for (const segment of path) {
    if (typeof segment === 'number') {
      if (!Array.isArray(current) || segment < 0 || segment >= current.length) {
        return undefined;
      }
      current = current[segment];
      continue;
    }

    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }
    const record = current as Record<string, unknown>;
    if (!(segment in record)) {
      return undefined;
    }
    current = record[segment];
  }
  return current;
}

function convertValueToExpectedType(value: unknown, expectedType: string): { changed: boolean; value: unknown } {
  if (expectedType === 'number' || expectedType === 'integer') {
    if (typeof value !== 'string') {
      return { changed: false, value };
    }

    const trimmed = value.trim();
    if (!/^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+\-]?\d+)?$/.test(trimmed)) {
      return { changed: false, value };
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      return { changed: false, value };
    }
    if (expectedType === 'integer' && !Number.isInteger(parsed)) {
      return { changed: false, value };
    }
    return { changed: true, value: parsed };
  }

  if (expectedType === 'boolean') {
    if (typeof value !== 'string') {
      return { changed: false, value };
    }

    const lowered = value.trim().toLowerCase();
    if (lowered === 'true') {
      return { changed: true, value: true };
    }
    if (lowered === 'false') {
      return { changed: true, value: false };
    }
    return { changed: false, value };
  }

  return { changed: false, value };
}
