import * as path from 'path';
import * as vscode from 'vscode';
import { parse, printParseErrorCode, type ParseError } from '../core/jsonc-parser';

const LANG_KEY_PATTERN = /^Lang key '(.+)' was not found/;
const ADD_LANG_KEY_COMMAND = 'cobblemonSchemaTools.addLangKey';

export function registerLangQuickFixProvider(
  context: vscode.ExtensionContext,
  scheduleValidation: () => void,
): void {
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      [
        { scheme: 'file', language: 'json' },
        { scheme: 'file', language: 'jsonc' },
        { scheme: 'file', language: 'javascript' },
        { scheme: 'file', language: 'typescript' },
      ],
      new LangQuickFixProvider(),
      { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] },
    ),
    vscode.commands.registerCommand(ADD_LANG_KEY_COMMAND, async (langKey: string) => {
      await addLangKeyToAllFiles(langKey);
      scheduleValidation();
    }),
  );
}

class LangQuickFixProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    _document: vscode.TextDocument,
    _range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      const match = LANG_KEY_PATTERN.exec(diagnostic.message);
      if (!match) {
        continue;
      }

      const langKey = match[1];
      const action = new vscode.CodeAction(
        `Add '${langKey}' to all lang files`,
        vscode.CodeActionKind.QuickFix,
      );
      action.diagnostics = [diagnostic];
      action.command = {
        title: `Add '${langKey}' to all lang files`,
        command: ADD_LANG_KEY_COMMAND,
        arguments: [langKey],
      };
      action.isPreferred = true;
      actions.push(action);
    }

    return actions;
  }
}

async function addLangKeyToAllFiles(langKey: string): Promise<void> {
  const langFiles = await vscode.workspace.findFiles('**/assets/*/lang/*.json');
  if (langFiles.length === 0) {
    void vscode.window.showWarningMessage('No lang files found in the workspace.');
    return;
  }

  let updated = 0;
  for (const uri of langFiles) {
    const obj = await readLangObject(uri);
    if (!obj || langKey in obj) {
      continue;
    }

    obj[langKey] = '';
    await vscode.workspace.fs.writeFile(
      uri,
      Buffer.from(JSON.stringify(obj, null, 2) + '\n', 'utf8'),
    );
    updated++;
  }

  if (updated > 0) {
    void vscode.window.showInformationMessage(
      `Added '${langKey}' to ${updated} lang file${updated === 1 ? '' : 's'}.`,
    );
  } else {
    void vscode.window.showInformationMessage(
      `'${langKey}' already exists in all lang files.`,
    );
  }
}

async function readLangObject(
  uri: vscode.Uri,
): Promise<Record<string, unknown> | undefined> {
  const raw = await vscode.workspace.fs.readFile(uri);
  const text = Buffer.from(raw).toString('utf8');
  const parseErrors: ParseError[] = [];
  const parsed = parse(text, parseErrors, {
    allowEmptyContent: false,
    allowTrailingComma: true,
    disallowComments: false,
  });

  if (parseErrors.length > 0) {
    void vscode.window.showErrorMessage(
      `Could not update lang file ${path.basename(uri.fsPath)}: ${printParseErrorCode(parseErrors[0].error)}.`,
    );
    return undefined;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    void vscode.window.showErrorMessage(
      `Could not update lang file ${path.basename(uri.fsPath)}: expected a JSON object.`,
    );
    return undefined;
  }

  return { ...(parsed as Record<string, unknown>) };
}
