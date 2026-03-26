import * as vscode from 'vscode';
import { type CommandDefinition } from './types';
import { pickWorkspaceFolder, writeFileIfMissing } from './command-utils';
import {
  COBBLEMON_PACK_MCMETA_DEFAULTS,
  buildDefaultPackMcmeta,
} from '../pack/pack-mcmeta';

export const generatePackMcmetaCommand: CommandDefinition = {
  id: 'cobblemonSchemaTools.generatePackMcmeta',
  run: async ({ scheduleValidation }) => {
    await generatePackMcmeta();
    scheduleValidation();
  },
};

async function generatePackMcmeta(): Promise<void> {
  const folder = await pickWorkspaceFolder();
  if (!folder) {
    return;
  }

  const description = await vscode.window.showInputBox({
    title: 'pack.mcmeta Description',
    prompt: `Defaults are based on Cobblemon ${COBBLEMON_PACK_MCMETA_DEFAULTS.cobblemonVersion} for Minecraft ${COBBLEMON_PACK_MCMETA_DEFAULTS.minecraftVersion}.`,
    value: COBBLEMON_PACK_MCMETA_DEFAULTS.description,
    validateInput: (value) =>
      value.trim().length > 0 ? undefined : 'Description is required.',
  });
  if (description === undefined) {
    return;
  }

  const targetUri = vscode.Uri.joinPath(folder.uri, 'pack.mcmeta');
  const content = buildDefaultPackMcmeta(description.trim());
  await writeFileIfMissing(targetUri, content);

  const doc = await vscode.workspace.openTextDocument(targetUri);
  await vscode.window.showTextDocument(doc);
  void vscode.window.showInformationMessage(
    `Generated pack.mcmeta using Cobblemon ${COBBLEMON_PACK_MCMETA_DEFAULTS.cobblemonVersion} defaults.`,
  );
}
