import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { isValidationEnabled } from './core/utils';
import { registerJsonSchemaAssistProviders } from './providers/json-schema-assist';
import { registerMoveFileAssistProviders } from './providers/move-file-assist';
import { CobblemonSchemaEngine } from './schema/schema-engine';
import { runWorkspaceValidation } from './validation/workspace-validation';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('cobblemon-schema-tools');
  context.subscriptions.push(diagnosticCollection);

  const engine = new CobblemonSchemaEngine();
  await engine.initialize(context);
  registerJsonSchemaAssistProviders(context, engine);
  registerMoveFileAssistProviders(context);

  let timeoutHandle: NodeJS.Timeout | undefined;
  const scheduleValidation = (): void => {
    if (!isValidationEnabled()) {
      diagnosticCollection.clear();
      return;
    }

    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }

    timeoutHandle = setTimeout(() => {
      void runWorkspaceValidation(engine, diagnosticCollection, context.extensionUri);
    }, 350);
  };

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(() => scheduleValidation()),
    vscode.workspace.onDidOpenTextDocument(() => scheduleValidation()),
    vscode.workspace.onDidCreateFiles(() => scheduleValidation()),
    vscode.workspace.onDidDeleteFiles(() => scheduleValidation()),
    vscode.workspace.onDidRenameFiles(() => scheduleValidation()),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('cobblemonSchemaTools')) {
        scheduleValidation();
      }
    })
  );

  registerCommands(context, {
    engine,
    diagnostics: diagnosticCollection,
    scheduleValidation,
  });

  scheduleValidation();
}

export function deactivate(): void {
  // Nothing to clean up explicitly.
}
