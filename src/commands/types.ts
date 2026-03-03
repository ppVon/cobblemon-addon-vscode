import * as vscode from 'vscode';
import { type CobblemonSchemaEngine } from '../schema/schema-engine';

export interface CommandExecutionContext {
  extensionContext: vscode.ExtensionContext;
  engine: CobblemonSchemaEngine;
  diagnostics: vscode.DiagnosticCollection;
  scheduleValidation: () => void;
}

export interface CommandDefinition {
  id: string;
  run: (context: CommandExecutionContext) => Promise<void>;
}
