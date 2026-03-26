import * as vscode from 'vscode';
import { generatePackMcmetaCommand } from './generate-pack-mcmeta.command';
import { generateSpawnPoolWorldCommand } from './generate-spawn-pool-world.command';
import { insertMoveCallbackCommand } from './insert-move-callback.command';
import { scaffoldMoveFileCommand } from './move-builder.command';
import { packageAddonCommand } from './package-addon.command';
import { scaffoldPokemonAssetsCommand } from './pokemon-builder.command';
import { scaffoldDataFileCommand } from './scaffold-data-file.command';
import { validateWorkspaceCommand } from './validate-workspace.command';
import { type CommandExecutionContext, type CommandDefinition } from './types';

const COMMAND_DEFINITIONS: CommandDefinition[] = [
  validateWorkspaceCommand,
  insertMoveCallbackCommand,
  generatePackMcmetaCommand,
  scaffoldMoveFileCommand,
  scaffoldPokemonAssetsCommand,
  scaffoldDataFileCommand,
  generateSpawnPoolWorldCommand,
  packageAddonCommand,
];

export function registerCommands(
  extensionContext: vscode.ExtensionContext,
  commandContext: Omit<CommandExecutionContext, 'extensionContext'>
): void {
  const fullContext: CommandExecutionContext = {
    extensionContext,
    ...commandContext,
  };

  for (const command of COMMAND_DEFINITIONS) {
    extensionContext.subscriptions.push(
      vscode.commands.registerCommand(command.id, async () => {
        await command.run(fullContext);
      })
    );
  }
}
