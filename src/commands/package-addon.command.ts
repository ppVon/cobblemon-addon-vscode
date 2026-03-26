import * as path from 'path';
import * as vscode from 'vscode';
import { type CommandDefinition } from './types';
import { pickWorkspaceFolder } from './command-utils';
import {
  createMissingPackMcmetaDiagnostic,
  validatePackMcmetaFile,
} from '../pack/pack-mcmeta';
import { buildZipArchive, collectWorkspaceZipEntries } from '../pack/zip';

export const packageAddonCommand: CommandDefinition = {
  id: 'cobblemonSchemaTools.packageAddon',
  run: async () => {
    await packageAddon();
  },
};

async function packageAddon(): Promise<void> {
  const folder = await pickWorkspaceFolder();
  if (!folder) {
    return;
  }

  const packUri = vscode.Uri.joinPath(folder.uri, 'pack.mcmeta');
  const packValidation = await validatePackMcmetaForPackaging(packUri);
  if (packValidation) {
    void vscode.window.showErrorMessage(packValidation);
    return;
  }

  const defaultZipUri = vscode.Uri.file(
    path.join(path.dirname(folder.uri.fsPath), `${folder.name}.zip`),
  );
  const targetUri = await vscode.window.showSaveDialog({
    title: 'Package Cobblemon addon zip',
    defaultUri: defaultZipUri,
    filters: {
      'Zip Archive': ['zip'],
    },
    saveLabel: 'Package Addon',
  });
  if (!targetUri) {
    return;
  }

  try {
    const entries = await collectWorkspaceZipEntries(folder.uri);
    const archive = buildZipArchive(entries);
    await vscode.workspace.fs.writeFile(targetUri, archive);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to package addon zip.';
    void vscode.window.showErrorMessage(message);
    return;
  }

  void vscode.window.showInformationMessage(
    `Packaged ${folder.name} to ${targetUri.fsPath}.`,
  );
}

async function validatePackMcmetaForPackaging(
  packUri: vscode.Uri,
): Promise<string | undefined> {
  try {
    await vscode.workspace.fs.stat(packUri);
  } catch {
    return createMissingPackMcmetaDiagnostic().message;
  }

  const diagnostics = await validatePackMcmetaFile(packUri);
  if (diagnostics.length === 0) {
    return undefined;
  }

  return diagnostics[0]?.message ?? 'pack.mcmeta is invalid.';
}
