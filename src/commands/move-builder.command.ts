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
import { moveFileExtension, useTypescriptForMoves } from '../core/utils';
import {
  WORKSPACE_MOVE_TYPES_CONTENT,
  WORKSPACE_MOVE_TYPES_PATH,
} from './move-builder/workspace-move-types';

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

  const typescriptMovesEnabled = useTypescriptForMoves();
  const formData = await showMoveBuilderForm(
    DEFAULT_MOVE_BUILDER_FORM,
    typescriptMovesEnabled,
  );
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

  const moveDataImportPath = typescriptMovesEnabled
    ? await ensureWorkspaceMoveTypes(folder.uri, targetUri)
    : undefined;
  const content = buildMoveTemplate(formData, { moveDataImportPath });
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
  return vscode.Uri.joinPath(dir, `${fileId}.${moveFileExtension()}`);
}

async function ensureWorkspaceMoveTypes(
  workspaceRoot: vscode.Uri,
  targetUri: vscode.Uri,
): Promise<string> {
  const helperUri = vscode.Uri.joinPath(
    workspaceRoot,
    ...WORKSPACE_MOVE_TYPES_PATH.split('/'),
  );
  await vscode.workspace.fs.createDirectory(
    vscode.Uri.joinPath(workspaceRoot, '.cobblemon-schema-tools'),
  );

  const currentContent = await readUtf8IfExists(helperUri);
  if (currentContent !== WORKSPACE_MOVE_TYPES_CONTENT) {
    await vscode.workspace.fs.writeFile(
      helperUri,
      Buffer.from(WORKSPACE_MOVE_TYPES_CONTENT, 'utf8'),
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
