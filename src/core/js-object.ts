import * as vscode from 'vscode';
import * as ts from 'typescript';

export interface JsParseIssue {
  message: string;
  start: number;
  length: number;
}

export interface ParsedJsObjectFile {
  uri: vscode.Uri;
  text: string;
  sourceFile: ts.SourceFile;
  parseErrors: JsParseIssue[];
  root: JsObjectNode | undefined;
  lineOffsets: number[];
}

export type JsValueNode =
  | JsObjectNode
  | JsArrayNode
  | JsLiteralNode
  | JsFunctionNode
  | JsUnsupportedNode;

export interface JsObjectNode {
  kind: 'object';
  node: ts.ObjectLiteralExpression;
  members: JsObjectMember[];
}

export type JsObjectMember =
  | JsPropertyMember
  | JsMethodMember
  | JsUnsupportedMember;

export interface JsPropertyMember {
  kind: 'property';
  key: string;
  keyNode: ts.Node;
  node: ts.PropertyAssignment | ts.ShorthandPropertyAssignment;
  value: JsValueNode;
}

export interface JsMethodMember {
  kind: 'method';
  key: string;
  keyNode: ts.Node;
  node: ts.MethodDeclaration;
}

export interface JsUnsupportedMember {
  kind: 'unsupported-member';
  message: string;
  node: ts.ObjectLiteralElementLike;
}

export interface JsArrayNode {
  kind: 'array';
  node: ts.ArrayLiteralExpression;
  elements: JsValueNode[];
}

export interface JsLiteralNode {
  kind: 'literal';
  node: ts.Expression;
  value: string | number | boolean | null;
  literalType: 'string' | 'number' | 'boolean' | 'null';
}

export interface JsFunctionNode {
  kind: 'function';
  node: ts.FunctionExpression | ts.ArrowFunction;
}

export interface JsUnsupportedNode {
  kind: 'unsupported';
  node: ts.Expression;
  message: string;
}

export async function parseWorkspaceJsObject(
  uri: vscode.Uri,
): Promise<ParsedJsObjectFile> {
  const raw = await vscode.workspace.fs.readFile(uri);
  const text = Buffer.from(raw).toString('utf8');
  return parseJsObjectText(uri, text);
}

export function parseJsObjectText(
  uri: vscode.Uri,
  text: string,
): ParsedJsObjectFile {
  const sourceFile = ts.createSourceFile(
    uri.fsPath,
    text,
    ts.ScriptTarget.Latest,
    true,
    uri.fsPath.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS,
  );
  const parseDiagnostics =
    (sourceFile as ts.SourceFile & {
      parseDiagnostics?: readonly ts.DiagnosticWithLocation[];
    }).parseDiagnostics ?? [];

  const parseErrors: JsParseIssue[] = parseDiagnostics.map(
    (diagnostic: ts.DiagnosticWithLocation) => ({
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      start: diagnostic.start ?? 0,
      length: diagnostic.length ?? 1,
    }),
  );

  let root: JsObjectNode | undefined;
  const expression = unwrapRootObjectExpression(sourceFile);
  if (!expression) {
    parseErrors.push({
      message:
        'File must contain a single top-level object literal expression.',
      start: 0,
      length: Math.max(1, text.length),
    });
  } else {
    root = parseObjectLiteral(expression);
  }

  return {
    uri,
    text,
    sourceFile,
    parseErrors,
    root,
    lineOffsets: computeLineOffsets(text),
  };
}

export function rangeForJsNode(
  parsed: ParsedJsObjectFile,
  node: ts.Node,
): vscode.Range {
  return rangeForJsSpan(
    parsed,
    node.getStart(parsed.sourceFile, false),
    Math.max(node.getWidth(parsed.sourceFile), 1),
  );
}

export function rangeForJsSpan(
  parsed: ParsedJsObjectFile,
  start: number,
  length: number,
): vscode.Range {
  const startPos = offsetToPosition(
    parsed.lineOffsets,
    Math.max(0, Math.min(start, parsed.text.length)),
  );
  const endPos = offsetToPosition(
    parsed.lineOffsets,
    Math.max(0, Math.min(start + length, parsed.text.length)),
  );
  return new vscode.Range(startPos, endPos);
}

function unwrapRootObjectExpression(
  sourceFile: ts.SourceFile,
): ts.ObjectLiteralExpression | undefined {
  const relevantStatements = sourceFile.statements.filter(
    (statement) => !ts.isImportDeclaration(statement),
  );
  if (relevantStatements.length !== 1) {
    return undefined;
  }

  const statement = relevantStatements[0];
  if (!ts.isExpressionStatement(statement)) {
    if (ts.isExportAssignment(statement)) {
      return unwrapObjectLikeExpression(statement.expression);
    }
    return undefined;
  }

  return unwrapObjectLikeExpression(statement.expression);
}

function unwrapObjectLikeExpression(
  expression: ts.Expression,
): ts.ObjectLiteralExpression | undefined {
  let current: ts.Expression = expression;
  while (true) {
    if (ts.isParenthesizedExpression(current)) {
      current = current.expression;
      continue;
    }
    if (ts.isSatisfiesExpression(current) || ts.isAsExpression(current)) {
      current = current.expression;
      continue;
    }
    break;
  }

  return ts.isObjectLiteralExpression(current) ? current : undefined;
}

function parseObjectLiteral(node: ts.ObjectLiteralExpression): JsObjectNode {
  return {
    kind: 'object',
    node,
    members: node.properties.map(parseObjectMember),
  };
}

function parseObjectMember(member: ts.ObjectLiteralElementLike): JsObjectMember {
  if (ts.isMethodDeclaration(member)) {
    const key = readPropertyName(member.name);
    if (!key) {
      return {
        kind: 'unsupported-member',
        message: 'Computed or unsupported property names are not supported.',
        node: member,
      };
    }

    return {
      kind: 'method',
      key,
      keyNode: member.name,
      node: member,
    };
  }

  if (ts.isPropertyAssignment(member)) {
    const key = readPropertyName(member.name);
    if (!key) {
      return {
        kind: 'unsupported-member',
        message: 'Computed or unsupported property names are not supported.',
        node: member,
      };
    }

    return {
      kind: 'property',
      key,
      keyNode: member.name,
      node: member,
      value: parseExpression(member.initializer),
    };
  }

  if (ts.isShorthandPropertyAssignment(member)) {
    return {
      kind: 'property',
      key: member.name.text,
      keyNode: member.name,
      node: member,
      value: {
        kind: 'unsupported',
        node: member.name,
        message: 'Shorthand properties are not supported in move files.',
      },
    };
  }

  return {
    kind: 'unsupported-member',
    message: 'Spread assignments and accessors are not supported in move files.',
    node: member,
  };
}

function parseExpression(expression: ts.Expression): JsValueNode {
  while (ts.isParenthesizedExpression(expression)) {
    expression = expression.expression;
  }

  if (ts.isObjectLiteralExpression(expression)) {
    return parseObjectLiteral(expression);
  }

  if (ts.isArrayLiteralExpression(expression)) {
    return {
      kind: 'array',
      node: expression,
      elements: expression.elements.map((element) => {
        if (ts.isSpreadElement(element)) {
          return {
            kind: 'unsupported',
            node: element.expression,
            message: 'Spread elements are not supported in move files.',
          };
        }
        return parseExpression(element);
      }),
    };
  }

  if (
    ts.isStringLiteral(expression) ||
    ts.isNoSubstitutionTemplateLiteral(expression)
  ) {
    return {
      kind: 'literal',
      node: expression,
      value: expression.text,
      literalType: 'string',
    };
  }

  if (ts.isNumericLiteral(expression)) {
    return {
      kind: 'literal',
      node: expression,
      value: Number(expression.text),
      literalType: 'number',
    };
  }

  if (
    ts.isPrefixUnaryExpression(expression) &&
    (expression.operator === ts.SyntaxKind.MinusToken ||
      expression.operator === ts.SyntaxKind.PlusToken) &&
    ts.isNumericLiteral(expression.operand)
  ) {
    const raw = Number(expression.operand.text);
    return {
      kind: 'literal',
      node: expression,
      value:
        expression.operator === ts.SyntaxKind.MinusToken ? -raw : raw,
      literalType: 'number',
    };
  }

  if (expression.kind === ts.SyntaxKind.TrueKeyword) {
    return {
      kind: 'literal',
      node: expression,
      value: true,
      literalType: 'boolean',
    };
  }

  if (expression.kind === ts.SyntaxKind.FalseKeyword) {
    return {
      kind: 'literal',
      node: expression,
      value: false,
      literalType: 'boolean',
    };
  }

  if (expression.kind === ts.SyntaxKind.NullKeyword) {
    return {
      kind: 'literal',
      node: expression,
      value: null,
      literalType: 'null',
    };
  }

  if (ts.isFunctionExpression(expression) || ts.isArrowFunction(expression)) {
    return {
      kind: 'function',
      node: expression,
    };
  }

  return {
    kind: 'unsupported',
    node: expression,
    message: `Unsupported JS expression kind '${ts.SyntaxKind[expression.kind]}'.`,
  };
}

function readPropertyName(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isPrivateIdentifier(name)) {
    return name.text;
  }

  if (ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }

  if (ts.isComputedPropertyName(name)) {
    return undefined;
  }

  return undefined;
}

function computeLineOffsets(text: string): number[] {
  const result: number[] = [0];
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      result.push(i + 1);
    }
  }
  return result;
}

function offsetToPosition(lineOffsets: number[], offset: number): vscode.Position {
  let low = 0;
  let high = lineOffsets.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (lineOffsets[mid] > offset) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }

  const line = Math.max(0, low - 1);
  return new vscode.Position(line, offset - lineOffsets[line]);
}
