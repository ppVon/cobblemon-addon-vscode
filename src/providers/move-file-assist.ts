import * as vscode from 'vscode';
import { parseJsObjectText } from '../core/js-object';
import { isMoveFilePath } from '../core/utils';
import {
  BOOSTS_COMPLETION_KEYS,
  CONDITION_CALLBACK_SNIPPETS,
  CONDITION_COMPLETION_KEYS,
  FLAGS_COMPLETION_KEYS,
  HIT_EFFECT_COMPLETION_KEYS,
  MAXMOVE_COMPLETION_KEYS,
  MOVE_CALLBACK_SNIPPETS,
  SECONDARY_EFFECT_COMPLETION_KEYS,
  TOP_LEVEL_MOVE_COMPLETION_KEYS,
  ZMOVE_COMPLETION_KEYS,
  buildCallbackMemberSnippet,
  buildNestedPropertySnippet,
  buildTopLevelPropertySnippet,
  type CallbackSnippetDefinition,
} from '../moves/authoring';
import { findMoveObjectContext, type MoveObjectContext } from '../moves/file-context';
import { MOVE_TYPES as MOVE_TYPE_CHOICES } from '../moves/spec';

export const MOVE_FILE_CONTEXT_KEY = 'cobblemonSchemaTools.inMoveFile';

const REQUIRED_MOVE_KEYS = new Set<string>([
  'accuracy',
  'basePower',
  'category',
  'name',
  'pp',
  'priority',
  'flags',
  'secondary',
  'target',
  'type',
]);

export function registerMoveFileAssistProviders(
  context: vscode.ExtensionContext,
): void {
  const selector: vscode.DocumentSelector = [
    { language: 'javascript', scheme: 'file' },
    { language: 'typescript', scheme: 'file' },
  ];

  const updateMoveFileContext = (editor: vscode.TextEditor | undefined): void => {
    void vscode.commands.executeCommand(
      'setContext',
      MOVE_FILE_CONTEXT_KEY,
      !!editor && isMoveFilePath(editor.document.uri.fsPath),
    );
  };

  updateMoveFileContext(vscode.window.activeTextEditor);

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      selector,
      new MoveFileCompletionProvider(),
      ',',
      '{',
    ),
    vscode.window.onDidChangeActiveTextEditor(updateMoveFileContext),
    vscode.workspace.onDidOpenTextDocument(() => {
      updateMoveFileContext(vscode.window.activeTextEditor);
    }),
    vscode.workspace.onDidCloseTextDocument(() => {
      updateMoveFileContext(vscode.window.activeTextEditor);
    }),
  );
}

class MoveFileCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    completionContext: vscode.CompletionContext,
  ): vscode.CompletionItem[] {
    if (!isMoveFilePath(document.uri.fsPath)) {
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

    const parsed = parseJsObjectText(document.uri, document.getText());
    const objectContext = findMoveObjectContext(parsed, document.offsetAt(position));
    if (!objectContext) {
      return [];
    }

    switch (objectContext.kind) {
      case 'top-level':
        return [
          ...createTopLevelPropertyItems(objectContext, keyTarget),
          ...createCallbackItems(MOVE_CALLBACK_SNIPPETS, objectContext, keyTarget),
        ];
      case 'condition':
        return [
          ...createConditionPropertyItems(objectContext, keyTarget),
          ...createCallbackItems(CONDITION_CALLBACK_SNIPPETS, objectContext, keyTarget),
        ];
      case 'flags':
        return createNestedPropertyItems(
          'flags',
          FLAGS_COMPLETION_KEYS,
          objectContext,
          keyTarget,
        );
      case 'boosts':
        return createNestedPropertyItems(
          'boosts',
          BOOSTS_COMPLETION_KEYS,
          objectContext,
          keyTarget,
        );
      case 'secondary-effect':
        return createNestedPropertyItems(
          'secondary-effect',
          SECONDARY_EFFECT_COMPLETION_KEYS,
          objectContext,
          keyTarget,
        );
      case 'hit-effect':
        return createNestedPropertyItems(
          'hit-effect',
          HIT_EFFECT_COMPLETION_KEYS,
          objectContext,
          keyTarget,
        );
      case 'zMove':
        return createNestedPropertyItems(
          'zMove',
          ZMOVE_COMPLETION_KEYS,
          objectContext,
          keyTarget,
        );
      case 'maxMove':
        return createNestedPropertyItems(
          'maxMove',
          MAXMOVE_COMPLETION_KEYS,
          objectContext,
          keyTarget,
        );
      case 'selfBoost':
        return createNestedPropertyItems(
          'selfBoost',
          ['boosts'],
          objectContext,
          keyTarget,
        );
      case 'ignoreImmunity':
        return createNestedPropertyItems(
          'ignoreImmunity',
          MOVE_TYPE_CHOICES,
          objectContext,
          keyTarget,
        );
      default:
        return [];
    }
  }
}

function createTopLevelPropertyItems(
  objectContext: MoveObjectContext,
  keyTarget: PropertyKeyTarget,
): vscode.CompletionItem[] {
  return TOP_LEVEL_MOVE_COMPLETION_KEYS
    .filter((key) => shouldOfferKey(objectContext, key, keyTarget.currentWord))
    .map((key) => {
      const item = new vscode.CompletionItem(
        key,
        vscode.CompletionItemKind.Property,
      );
      item.detail = REQUIRED_MOVE_KEYS.has(key)
        ? 'required move property'
        : 'move property';
      item.insertText = new vscode.SnippetString(
        buildTopLevelPropertySnippet(key),
      );
      item.range = keyTarget.range;
      item.sortText = `${REQUIRED_MOVE_KEYS.has(key) ? '1' : '2'}-${key}`;
      return item;
    });
}

function createConditionPropertyItems(
  objectContext: MoveObjectContext,
  keyTarget: PropertyKeyTarget,
): vscode.CompletionItem[] {
  return CONDITION_COMPLETION_KEYS
    .filter((key) => shouldOfferKey(objectContext, key, keyTarget.currentWord))
    .map((key) => {
      const item = new vscode.CompletionItem(
        key,
        vscode.CompletionItemKind.Property,
      );
      item.detail = 'condition property';
      item.insertText = new vscode.SnippetString(
        buildNestedPropertySnippet('condition', key),
      );
      item.range = keyTarget.range;
      item.sortText = `1-${key}`;
      return item;
    });
}

function createNestedPropertyItems(
  context:
    | 'flags'
    | 'boosts'
    | 'secondary-effect'
    | 'hit-effect'
    | 'zMove'
    | 'maxMove'
    | 'selfBoost'
    | 'ignoreImmunity',
  keys: readonly string[],
  objectContext: MoveObjectContext,
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
        buildNestedPropertySnippet(context, key),
      );
      item.range = keyTarget.range;
      item.sortText = `1-${key}`;
      return item;
    });
}

function createCallbackItems(
  callbacks: readonly CallbackSnippetDefinition[],
  objectContext: MoveObjectContext,
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
  objectContext: MoveObjectContext,
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
