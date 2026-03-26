import * as vscode from 'vscode';
import { parseJsObjectText } from '../core/js-object';
import { isMoveFilePath } from '../core/utils';
import {
  CONDITION_CALLBACK_SNIPPETS,
  MOVE_CALLBACK_SNIPPETS,
  buildCallbackMemberSnippet,
} from '../moves/authoring';
import { findMoveObjectContext } from '../moves/file-context';
import { type CommandDefinition } from './types';

export const insertMoveCallbackCommand: CommandDefinition = {
  id: 'cobblemonSchemaTools.insertMoveCallback',
  run: async () => {
    await insertMoveCallback();
  },
};

async function insertMoveCallback(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || !isMoveFilePath(editor.document.uri.fsPath)) {
    void vscode.window.showErrorMessage('Open a Cobblemon move JS or TS file first.');
    return;
  }

  const document = editor.document;
  const parsed = parseJsObjectText(document.uri, document.getText());
  if (!parsed.root) {
    void vscode.window.showErrorMessage('The current move file could not be parsed.');
    return;
  }

  const offset = document.offsetAt(editor.selection.active);
  const objectContext = findMoveObjectContext(parsed, offset);
  if (!objectContext) {
    void vscode.window.showErrorMessage(
      'Place the cursor inside the move object or its condition block.',
    );
    return;
  }

  const callbackDefinitions =
    objectContext.kind === 'condition'
      ? CONDITION_CALLBACK_SNIPPETS
      : MOVE_CALLBACK_SNIPPETS;
  const availableCallbacks = callbackDefinitions.filter(
    (definition) => !objectContext.existingKeys.has(definition.key),
  );

  if (availableCallbacks.length === 0) {
    void vscode.window.showInformationMessage(
      objectContext.kind === 'condition'
        ? 'All built-in condition callback snippets are already present here.'
        : 'All built-in move callback snippets are already present here.',
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
          ? 'Insert Condition Callback'
          : 'Insert Move Callback',
    },
  );
  if (!picked) {
    return;
  }

  const insertPosition = document.positionAt(objectContext.object.node.end - 1);
  const closeLineText = document.lineAt(insertPosition.line).text;
  const baseIndent = closeLineText.match(/^\s*/)?.[0] ?? '';
  const memberIndent = `${baseIndent}${indentUnit(editor.options)}`;
  const insertionPrefix = buildInsertionPrefix(
    document.getText(),
    objectContext.object.node.end - 1,
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
