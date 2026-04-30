import * as vscode from 'vscode';
import { parseJsObjectText, parseJsObjectTextBareSafe } from '../core/js-object';
import { isAbilityFilePath } from '../core/utils';
import {
  ABILITY_CALLBACK_SNIPPETS,
  ABILITY_CONDITION_CALLBACK_SNIPPETS,
  ABILITY_CONDITION_COMPLETION_KEYS,
  ABILITY_FLAGS_COMPLETION_KEYS,
  TOP_LEVEL_ABILITY_COMPLETION_KEYS,
  buildCallbackMemberSnippet,
  buildNestedAbilityPropertySnippet,
  buildTopLevelAbilityPropertySnippet,
  type CallbackSnippetDefinition,
} from '../abilities/authoring';
import {
  findAbilityObjectContext,
  type AbilityObjectContext,
} from '../abilities/file-context';

export const ABILITY_FILE_CONTEXT_KEY = 'cobblemonSchemaTools.inAbilityFile';

const REQUIRED_ABILITY_KEYS = new Set<string>(['name', 'rating', 'flags']);

export function registerAbilityFileAssistProviders(
  context: vscode.ExtensionContext,
): void {
  const selector: vscode.DocumentSelector = [
    { language: 'javascript', scheme: 'file' },
    { language: 'typescript', scheme: 'file' },
  ];

  const updateAbilityFileContext = (
    editor: vscode.TextEditor | undefined,
  ): void => {
    void vscode.commands.executeCommand(
      'setContext',
      ABILITY_FILE_CONTEXT_KEY,
      !!editor && isAbilityFilePath(editor.document.uri.fsPath),
    );
  };

  updateAbilityFileContext(vscode.window.activeTextEditor);

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      selector,
      new AbilityFileCompletionProvider(),
      ',',
      '{',
    ),
    vscode.window.onDidChangeActiveTextEditor(updateAbilityFileContext),
    vscode.workspace.onDidOpenTextDocument(() => {
      updateAbilityFileContext(vscode.window.activeTextEditor);
    }),
    vscode.workspace.onDidCloseTextDocument(() => {
      updateAbilityFileContext(vscode.window.activeTextEditor);
    }),
  );
}

class AbilityFileCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    completionContext: vscode.CompletionContext,
  ): vscode.CompletionItem[] {
    if (!isAbilityFilePath(document.uri.fsPath)) {
      return [];
    }

    const keyTarget = resolvePropertyKeyTarget(
      document,
      position,
      completionContext,
    );
    if (!keyTarget) {
      return [];
    }

    const isTsFile = document.uri.fsPath.endsWith('.ts');
    const parsed = isTsFile
      ? parseJsObjectText(document.uri, document.getText())
      : parseJsObjectTextBareSafe(document.uri, document.getText());
    const objectContext = findAbilityObjectContext(
      parsed,
      document.offsetAt(position) + (parsed._wrapOffset ?? 0),
    );
    if (!objectContext) {
      return [];
    }

    switch (objectContext.kind) {
      case 'top-level':
        return [
          ...createTopLevelPropertyItems(objectContext, keyTarget),
          ...createCallbackItems(
            ABILITY_CALLBACK_SNIPPETS,
            objectContext,
            keyTarget,
          ),
        ];
      case 'condition':
        return [
          ...createConditionPropertyItems(objectContext, keyTarget),
          ...createCallbackItems(
            ABILITY_CONDITION_CALLBACK_SNIPPETS,
            objectContext,
            keyTarget,
          ),
        ];
      case 'flags':
        return createNestedPropertyItems(
          'flags',
          ABILITY_FLAGS_COMPLETION_KEYS,
          objectContext,
          keyTarget,
        );
      default:
        return [];
    }
  }
}

function createTopLevelPropertyItems(
  objectContext: AbilityObjectContext,
  keyTarget: PropertyKeyTarget,
): vscode.CompletionItem[] {
  return TOP_LEVEL_ABILITY_COMPLETION_KEYS
    .filter((key) => shouldOfferKey(objectContext, key, keyTarget.currentWord))
    .map((key) => {
      const item = new vscode.CompletionItem(
        key,
        vscode.CompletionItemKind.Property,
      );
      item.detail = REQUIRED_ABILITY_KEYS.has(key)
        ? 'required ability property'
        : 'ability property';
      item.insertText = new vscode.SnippetString(
        buildTopLevelAbilityPropertySnippet(key),
      );
      item.range = keyTarget.range;
      item.sortText = `${REQUIRED_ABILITY_KEYS.has(key) ? '1' : '2'}-${key}`;
      return item;
    });
}

function createConditionPropertyItems(
  objectContext: AbilityObjectContext,
  keyTarget: PropertyKeyTarget,
): vscode.CompletionItem[] {
  return ABILITY_CONDITION_COMPLETION_KEYS
    .filter((key) => shouldOfferKey(objectContext, key, keyTarget.currentWord))
    .map((key) => {
      const item = new vscode.CompletionItem(
        key,
        vscode.CompletionItemKind.Property,
      );
      item.detail = 'condition property';
      item.insertText = new vscode.SnippetString(
        buildNestedAbilityPropertySnippet('condition', key),
      );
      item.range = keyTarget.range;
      item.sortText = `1-${key}`;
      return item;
    });
}

function createNestedPropertyItems(
  context: 'flags',
  keys: readonly string[],
  objectContext: AbilityObjectContext,
  keyTarget: PropertyKeyTarget,
): vscode.CompletionItem[] {
  return keys
    .filter((key) => shouldOfferKey(objectContext, key, keyTarget.currentWord))
    .map((key) => {
      const item = new vscode.CompletionItem(
        key,
        vscode.CompletionItemKind.Property,
      );
      item.detail = `${context} property`;
      item.insertText = new vscode.SnippetString(
        buildNestedAbilityPropertySnippet(context, key),
      );
      item.range = keyTarget.range;
      item.sortText = `1-${key}`;
      return item;
    });
}

function createCallbackItems(
  callbacks: readonly CallbackSnippetDefinition[],
  objectContext: AbilityObjectContext,
  keyTarget: PropertyKeyTarget,
): vscode.CompletionItem[] {
  return callbacks
    .filter((callback) =>
      shouldOfferKey(objectContext, callback.key, keyTarget.currentWord),
    )
    .map((callback) => {
      const item = new vscode.CompletionItem(
        callback.key,
        callback.numericPlaceholder
          ? vscode.CompletionItemKind.Constant
          : vscode.CompletionItemKind.Method,
      );
      item.detail = callback.detail;
      item.documentation = callback.documentation;
      item.insertText = new vscode.SnippetString(
        buildCallbackMemberSnippet(callback),
      );
      item.range = keyTarget.range;
      item.sortText = `0-${callback.key}`;
      return item;
    });
}

function shouldOfferKey(
  objectContext: AbilityObjectContext,
  key: string,
  currentWord: string,
): boolean {
  return !objectContext.existingKeys.has(key) || key === currentWord;
}

interface PropertyKeyTarget {
  readonly currentWord: string;
  readonly range: vscode.Range;
}

function resolvePropertyKeyTarget(
  document: vscode.TextDocument,
  position: vscode.Position,
  completionContext: vscode.CompletionContext,
): PropertyKeyTarget | undefined {
  const wordRange =
    document.getWordRangeAtPosition(position, /[$A-Za-z_][$0-9A-Za-z_]*/)
    ?? new vscode.Range(position, position);
  const currentWord = wordRange.isEmpty ? '' : document.getText(wordRange);

  const text = document.getText();
  const keyStartOffset = document.offsetAt(wordRange.start);
  const previous = findPreviousNonWhitespace(text, keyStartOffset - 1);
  if (previous !== '{' && previous !== ',') {
    return undefined;
  }

  if (
    currentWord.length === 0 &&
    completionContext.triggerKind !== vscode.CompletionTriggerKind.Invoke
  ) {
    return undefined;
  }

  return {
    currentWord,
    range: wordRange,
  };
}

function findPreviousNonWhitespace(
  text: string,
  startOffset: number,
): string | undefined {
  for (let i = startOffset; i >= 0; i--) {
    const char = text[i];
    if (!/\s/.test(char)) {
      return char;
    }
  }
  return undefined;
}
