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

  const content = buildMoveTemplate(formData);
  await writeFileIfMissing(targetUri, content);

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
