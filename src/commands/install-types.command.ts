import * as vscode from 'vscode';
import { type CommandDefinition } from './types';
import { pickWorkspaceFolder } from './command-utils';
import {
  WORKSPACE_ABILITY_TYPES_CONTENT,
  WORKSPACE_ABILITY_TYPES_PATH,
} from './ability-builder/workspace-ability-types';
import {
  WORKSPACE_MOVE_TYPES_CONTENT,
  WORKSPACE_MOVE_TYPES_PATH,
} from './move-builder/workspace-move-types';

export const installTypesCommand: CommandDefinition = {
  id: 'cobblemonSchemaTools.installTypes',
  run: async () => {
    await installTypes();
  },
};

async function installTypes(): Promise<void> {
  const folder = await pickWorkspaceFolder();
  if (!folder) {
    return;
  }

  const toolsDir = vscode.Uri.joinPath(folder.uri, '.cobblemon-schema-tools');
  await vscode.workspace.fs.createDirectory(toolsDir);

  await writeTypeFile(folder.uri, WORKSPACE_ABILITY_TYPES_PATH, WORKSPACE_ABILITY_TYPES_CONTENT);
  await writeTypeFile(folder.uri, WORKSPACE_MOVE_TYPES_PATH, WORKSPACE_MOVE_TYPES_CONTENT);

  void vscode.window.showInformationMessage(
    'Cobblemon type definitions installed to .cobblemon-schema-tools/.',
  );
}

async function writeTypeFile(
  workspaceRoot: vscode.Uri,
  relativePath: string,
  content: string,
): Promise<void> {
  const uri = vscode.Uri.joinPath(workspaceRoot, ...relativePath.split('/'));
  await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
}
