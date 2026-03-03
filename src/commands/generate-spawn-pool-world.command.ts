import * as path from 'path';
import * as vscode from 'vscode';
import { type CommandDefinition } from './types';
import { pickWorkspaceFolder, writeFileIfMissing } from './command-utils';
import { buildSpawnPoolWorldTemplate, collectWorkspaceSpecies } from './species-utils';

export const generateSpawnPoolWorldCommand: CommandDefinition = {
  id: 'cobblemonSchemaTools.generateSpawnPoolWorld',
  run: async ({ scheduleValidation }) => {
    await generateSpawnPoolWorldFromSpecies();
    scheduleValidation();
  },
};

async function generateSpawnPoolWorldFromSpecies(): Promise<void> {
  const folder = await pickWorkspaceFolder();
  if (!folder) {
    return;
  }

  const speciesRecords = await collectWorkspaceSpecies(folder.uri);
  if (speciesRecords.length === 0) {
    void vscode.window.showWarningMessage('No species files were found under data/*/species/**/*.json.');
    return;
  }

  const selected = await vscode.window.showQuickPick(
    speciesRecords.map((record) => ({
      label: record.id,
      description: record.dexNumber ? `#${record.dexNumber} ${record.displayName}` : record.displayName,
      detail: path.relative(folder.uri.fsPath, record.uri.fsPath),
      record,
    })),
    {
      title: 'Select species for spawn_pool_world generation',
      placeHolder: 'Search by species id, name, or file path',
      matchOnDescription: true,
      matchOnDetail: true,
    }
  );

  if (!selected) {
    return;
  }

  const targetDir = vscode.Uri.joinPath(folder.uri, 'data', selected.record.namespace, 'spawn_pool_world');
  await vscode.workspace.fs.createDirectory(targetDir);

  const fileBase = selected.record.dexNumber
    ? `${String(selected.record.dexNumber).padStart(4, '0')}_${selected.record.slug}`
    : selected.record.slug;
  const targetUri = vscode.Uri.joinPath(targetDir, `${fileBase}.json`);

  const content = JSON.stringify(buildSpawnPoolWorldTemplate(selected.record), null, 2) + '\n';
  await writeFileIfMissing(targetUri, content);

  const doc = await vscode.workspace.openTextDocument(targetUri);
  await vscode.window.showTextDocument(doc);
}
