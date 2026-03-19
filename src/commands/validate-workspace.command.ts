import { runWorkspaceValidation } from '../validation/workspace-validation';
import { type CommandDefinition } from './types';

export const validateWorkspaceCommand: CommandDefinition = {
  id: 'cobblemonSchemaTools.validateWorkspace',
  run: async ({ engine, diagnostics, extensionContext }) => {
    await runWorkspaceValidation(engine, diagnostics, extensionContext.extensionUri, true);
  },
};
