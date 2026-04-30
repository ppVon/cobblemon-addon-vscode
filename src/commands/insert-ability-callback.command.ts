import * as vscode from 'vscode';
import { parseJsObjectText, parseJsObjectTextBareSafe } from '../core/js-object';
import { isAbilityFilePath } from '../core/utils';
import {
  ABILITY_CALLBACK_SNIPPETS,
  ABILITY_CONDITION_CALLBACK_SNIPPETS,
  buildCallbackMemberSnippet,
} from '../abilities/authoring';
import { findAbilityObjectContext } from '../abilities/file-context';
import { type CommandDefinition } from './types';

export const insertAbilityCallbackCommand: CommandDefinition = {
  id: 'cobblemonSchemaTools.insertAbilityCallback',
  run: async () => {
    await insertAbilityCallback();
  },
};

async function insertAbilityCallback(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || !isAbilityFilePath(editor.document.uri.fsPath)) {
    void vscode.window.showErrorMessage(
      'Open a Cobblemon ability JS or TS file first.',
    );
    return;
  }

  const document = editor.document;
  const isTsFile = document.uri.fsPath.endsWith('.ts');
  const parsed = isTsFile
    ? parseJsObjectText(document.uri, document.getText())
    : parseJsObjectTextBareSafe(document.uri, document.getText());
  if (!parsed.root) {
    void vscode.window.showErrorMessage(
      'The current ability file could not be parsed.',
    );
    return;
  }

  const offset = document.offsetAt(editor.selection.active);
  const wrapOffset = parsed._wrapOffset ?? 0;
  const objectContext = findAbilityObjectContext(parsed, offset + wrapOffset);
  if (!objectContext) {
    void vscode.window.showErrorMessage(
      'Place the cursor inside the ability object or its condition block.',
    );
    return;
  }

  const callbackDefinitions =
    objectContext.kind === 'condition'
      ? ABILITY_CONDITION_CALLBACK_SNIPPETS
      : ABILITY_CALLBACK_SNIPPETS;
  const availableCallbacks = callbackDefinitions.filter(
    (definition) => !objectContext.existingKeys.has(definition.key),
  );

  if (availableCallbacks.length === 0) {
    void vscode.window.showInformationMessage(
      objectContext.kind === 'condition'
        ? 'All built-in ability condition callback snippets are already present here.'
        : 'All built-in ability callback snippets are already present here.',
    );
    return;
  }

  const picked = await vscode.window.showQuickPick(
    availableCallbacks.map((definition) => ({
      label: definition.key,
      detail: definition.detail,
      definition,
    })),
    {
      title:
        objectContext.kind === 'condition'
          ? 'Insert Ability Condition Callback'
          : 'Insert Ability Callback',
    },
  );
  if (!picked) {
    return;
  }

  const objectEnd = objectContext.object.node.end - wrapOffset;
  const insertPosition = document.positionAt(objectEnd - 1);
  const closeLineText = document.lineAt(insertPosition.line).text;
  const baseIndent = closeLineText.match(/^\s*/)?.[0] ?? '';
  const memberIndent = `${baseIndent}${indentUnit(editor.options)}`;
  const insertionPrefix = buildInsertionPrefix(
    document.getText(),
    objectEnd - 1,
  );
  const snippetText =
    insertionPrefix
    + indentSnippet(buildCallbackMemberSnippet(picked.definition), memberIndent)
    + `\n${baseIndent}`;

  await editor.insertSnippet(new vscode.SnippetString(snippetText), insertPosition);
}

function indentUnit(options: vscode.TextEditorOptions): string {
  if (!options.insertSpaces) {
    return '\t';
  }

  const tabSize =
    typeof options.tabSize === 'number'
      ? options.tabSize
      : Number.parseInt(String(options.tabSize ?? 2), 10);
  return ' '.repeat(Number.isFinite(tabSize) && tabSize > 0 ? tabSize : 2);
}

function indentSnippet(snippet: string, indent: string): string {
  return snippet
    .split('\n')
    .map((line) => `${indent}${line}`)
    .join('\n');
}

function buildInsertionPrefix(
  text: string,
  closeBraceOffset: number,
): string {
  const previous = findPreviousNonWhitespace(text, closeBraceOffset - 1);
  if (!previous || previous === '{') {
    return '\n';
  }
  return previous === ',' ? '\n' : ',\n';
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
