import * as path from 'path';
import * as vscode from 'vscode';
import { type CommandDefinition } from './types';
import { pickWorkspaceFolder, writeFileIfMissing } from './command-utils';
import { showMoveBuilderForm } from './move-builder/webview';
import { buildMoveTemplate } from './move-builder/templates';
import {
  DEFAULT_MOVE_BUILDER_FORM,
  type MoveBuilderFormData,
} from './move-builder/types';
import { validateMoveBuilderFormData } from './move-builder/form-validation';

export const scaffoldMoveFileCommand: CommandDefinition = {
  id: 'cobblemonSchemaTools.scaffoldMoveFile',
  run: async ({ scheduleValidation }) => {
    await scaffoldMoveFile();
    scheduleValidation();
  },
};

async function scaffoldMoveFile(): Promise<void> {
  const folder = await pickWorkspaceFolder();
  if (!folder) {
    return;
  }

  const formData = await showMoveBuilderForm(DEFAULT_MOVE_BUILDER_FORM);
  if (!formData) {
    return;
  }

  const validationError = validateMoveBuilderFormData(formData);
  if (validationError) {
    void vscode.window.showErrorMessage(validationError);
    return;
  }

  const targetUri = await resolveMoveTargetUri(folder.uri, formData);
  if (!targetUri) {
    return;
  }

  const moveDataImportPath = await resolveMoveDataImportPath(folder.uri, targetUri);
  const content = buildMoveTemplate(formData, { moveDataImportPath });
  await writeFileIfMissing(targetUri, content);

  if (!moveDataImportPath) {
    void vscode.window.showWarningMessage(
      "Couldn't find cobblemon-showdown/sim/dex-moves.ts nearby, so this move file was generated without MoveData type checking.",
    );
  }

  void vscode.window.showInformationMessage(
    `Move builder generated ${formData.namespace}:${formData.fileId}.`,
  );

  const doc = await vscode.workspace.openTextDocument(targetUri);
  await vscode.window.showTextDocument(doc);
}

async function resolveMoveTargetUri(
  workspaceRoot: vscode.Uri,
  formData: MoveBuilderFormData,
): Promise<vscode.Uri | undefined> {
  const namespace = formData.namespace.trim().toLowerCase();
  const fileId = formData.fileId.trim().toLowerCase();
  if (!namespace || !fileId) {
    return undefined;
  }

  const dir = vscode.Uri.joinPath(workspaceRoot, 'data', namespace, 'moves');
  await vscode.workspace.fs.createDirectory(dir);
  return vscode.Uri.joinPath(dir, `${fileId}.ts`);
}

async function resolveMoveDataImportPath(
  workspaceRoot: vscode.Uri,
  targetUri: vscode.Uri,
): Promise<string | undefined> {
  const candidates: vscode.Uri[] = [
    vscode.Uri.joinPath(workspaceRoot, '..', 'cobblemon-showdown', 'sim', 'dex-moves.ts'),
    vscode.Uri.joinPath(workspaceRoot, 'cobblemon-showdown', 'sim', 'dex-moves.ts'),
  ];

  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    if (path.basename(folder.uri.fsPath) === 'cobblemon-showdown') {
      candidates.push(vscode.Uri.joinPath(folder.uri, 'sim', 'dex-moves.ts'));
    }
  }

  for (const candidate of candidates) {
    if (!(await uriExists(candidate))) {
      continue;
    }

    const relativePath = path.relative(
      path.dirname(targetUri.fsPath),
      candidate.fsPath,
    );
    const withoutExtension = relativePath.replace(/\.ts$/i, '');
    return withoutExtension.startsWith('.')
      ? withoutExtension.replace(/\\/g, '/')
      : `./${withoutExtension.replace(/\\/g, '/')}`;
  }

  return undefined;
}

async function uriExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}
