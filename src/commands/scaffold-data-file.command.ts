import * as path from 'path';
import * as vscode from 'vscode';
import { type CommandDefinition } from './types';
import { pickWorkspaceFolder, writeFileIfMissing } from './command-utils';

export const scaffoldDataFileCommand: CommandDefinition = {
  id: 'cobblemonSchemaTools.scaffoldDataFile',
  run: async ({ engine, scheduleValidation }) => {
    await scaffoldDataFile(engine);
    scheduleValidation();
  },
};

async function scaffoldDataFile(engine: import('../schema/schema-engine').CobblemonSchemaEngine): Promise<void> {
  const folder = await pickWorkspaceFolder();
  if (!folder) {
    return;
  }

  const schemaOptions = engine.getDataSchemaOptions();
  const selected = await vscode.window.showQuickPick(
    schemaOptions.map((entry) => ({ label: entry.label, detail: entry.schemaPath, entry })),
    { title: 'Select Cobblemon schema type for new data file' }
  );

  if (!selected) {
    return;
  }

  const namespace = (await vscode.window.showInputBox({
    title: 'Data Namespace',
    prompt: 'Namespace under data/<namespace>/...',
    value: 'cobblemon',
    validateInput: (value) => (/^[a-z0-9_.-]+$/.test(value) ? undefined : 'Use lowercase namespace characters.'),
  }))?.trim();

  if (!namespace) {
    return;
  }

  const schemaPath = selected.entry.schemaPath;
  const targetUri = await resolveTargetDataFileUri(folder.uri, schemaPath, namespace);
  if (!targetUri) {
    return;
  }

  const defaultId = path.basename(targetUri.fsPath, '.json');
  const content = engine.createTemplateForSchema(schemaPath, defaultId);
  await writeFileIfMissing(targetUri, content);

  const doc = await vscode.workspace.openTextDocument(targetUri);
  await vscode.window.showTextDocument(doc);
}

async function resolveTargetDataFileUri(workspaceRoot: vscode.Uri, schemaPath: string, namespace: string): Promise<vscode.Uri | undefined> {
  const mechanics = schemaPath.match(/^schemas\/mechanics\/([^.]+)\.schema\.json$/);
  if (mechanics) {
    const dir = vscode.Uri.joinPath(workspaceRoot, 'data', namespace, 'mechanics');
    await vscode.workspace.fs.createDirectory(dir);
    return vscode.Uri.joinPath(dir, `${mechanics[1]}.json`);
  }

  const ride = schemaPath.match(/^schemas\/ride_settings\/([^.]+)\.schema\.json$/);
  if (ride) {
    const dir = vscode.Uri.joinPath(workspaceRoot, 'data', namespace, 'ride_settings');
    await vscode.workspace.fs.createDirectory(dir);
    return vscode.Uri.joinPath(dir, `${ride[1]}.json`);
  }

  const folder = schemaPath.match(/^schemas\/([^/]+)\/schema\.json$/)?.[1];
  if (!folder || folder === '_shared') {
    return undefined;
  }

  const id = (await vscode.window.showInputBox({
    title: 'File id',
    prompt: `File id for data/${namespace}/${folder}/...`,
    value: 'new_entry',
    validateInput: (value) => (value.trim().length > 0 ? undefined : 'Provide a file id.'),
  }))?.trim();

  if (!id) {
    return undefined;
  }

  const dir = vscode.Uri.joinPath(workspaceRoot, 'data', namespace, folder);
  await vscode.workspace.fs.createDirectory(dir);
  return vscode.Uri.joinPath(dir, `${id}.json`);
}
