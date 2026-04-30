import * as path from 'path';
import * as vscode from 'vscode';
import { type CommandDefinition } from './types';
import { isAbilityFilePath, isMoveFilePath } from '../core/utils';
import {
  WORKSPACE_ABILITY_TYPES_CONTENT,
  WORKSPACE_ABILITY_TYPES_PATH,
} from './ability-builder/workspace-ability-types';
import {
  WORKSPACE_MOVE_TYPES_CONTENT,
  WORKSPACE_MOVE_TYPES_PATH,
} from './move-builder/workspace-move-types';

export const convertToTsCommand: CommandDefinition = {
  id: 'cobblemonSchemaTools.convertToTs',
  run: async ({ scheduleValidation }) => {
    await convertToTs();
    scheduleValidation();
  },
};

async function convertToTs(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const uri = editor.document.uri;
  const filePath = uri.fsPath;

  if (!filePath.endsWith('.js')) {
    void vscode.window.showErrorMessage(
      'The active file must be a .js file to convert to TypeScript.',
    );
    return;
  }

  const isAbility = isAbilityFilePath(filePath);
  const isMove = isMoveFilePath(filePath);

  if (!isAbility && !isMove) {
    void vscode.window.showErrorMessage(
      'The active file must be a Cobblemon ability or move .js file.',
    );
    return;
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  if (!workspaceFolder) {
    void vscode.window.showErrorMessage(
      'Cannot determine workspace folder for this file.',
    );
    return;
  }

  const jsContent = editor.document.getText();
  const tsUri = vscode.Uri.file(filePath.replace(/\.js$/, '.ts'));

  const importPath = isAbility
    ? await ensureTypes(workspaceFolder.uri, tsUri, WORKSPACE_ABILITY_TYPES_PATH, WORKSPACE_ABILITY_TYPES_CONTENT)
    : await ensureTypes(workspaceFolder.uri, tsUri, WORKSPACE_MOVE_TYPES_PATH, WORKSPACE_MOVE_TYPES_CONTENT);

  const typeName = isAbility ? 'AbilityData' : 'MoveData';
  const typeLabel = isAbility ? 'ability' : 'move';

  // Move JS files wrap their object in parens: ({...}) or ({...}); — strip before re-wrapping
  let objectContent = jsContent.trimEnd();
  if (objectContent.endsWith(';')) {
    objectContent = objectContent.slice(0, -1).trimEnd();
  }
  if (objectContent.startsWith('(') && objectContent.endsWith(')')) {
    objectContent = objectContent.slice(1, -1).trimEnd();
  }

  const tsContent = [
    `// This ${typeLabel} uses Typescript-only typing helpers.`,
    `// You MUST use "Cobblemon: Package Addon Zip" before putting this addon into the game.`,
    `import type { ${typeName} } from ${JSON.stringify(importPath)};`,
    ``,
    `(${objectContent} satisfies ${typeName});`,
    ``,
  ].join('\n');

  await vscode.workspace.fs.writeFile(tsUri, Buffer.from(tsContent, 'utf8'));
  await vscode.workspace.fs.delete(uri);

  const doc = await vscode.workspace.openTextDocument(tsUri);
  await vscode.window.showTextDocument(doc);

  void vscode.window.showInformationMessage(
    `Converted to TypeScript: ${path.basename(tsUri.fsPath)}`,
  );
}

async function ensureTypes(
  workspaceRoot: vscode.Uri,
  targetUri: vscode.Uri,
  typesPath: string,
  typesContent: string,
): Promise<string> {
  const helperUri = vscode.Uri.joinPath(workspaceRoot, ...typesPath.split('/'));
  await vscode.workspace.fs.createDirectory(
    vscode.Uri.joinPath(workspaceRoot, '.cobblemon-schema-tools'),
  );

  const currentContent = await readUtf8IfExists(helperUri);
  if (currentContent !== typesContent) {
    await vscode.workspace.fs.writeFile(
      helperUri,
      Buffer.from(typesContent, 'utf8'),
    );
  }

  const relativePath = path.relative(
    path.dirname(targetUri.fsPath),
    helperUri.fsPath,
  );
  const withoutExtension = relativePath
    .replace(/\.d\.ts$/i, '')
    .replace(/\.ts$/i, '');
  return withoutExtension.startsWith('.')
    ? withoutExtension.replace(/\\/g, '/')
    : `./${withoutExtension.replace(/\\/g, '/')}`;
}

async function readUtf8IfExists(uri: vscode.Uri): Promise<string | undefined> {
  try {
    const raw = await vscode.workspace.fs.readFile(uri);
    return Buffer.from(raw).toString('utf8');
  } catch {
    return undefined;
  }
}
