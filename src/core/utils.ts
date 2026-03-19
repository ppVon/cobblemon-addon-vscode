import * as path from 'path';
import * as vscode from 'vscode';

export const DATA_ROOT_EXCLUDE = '**/{.git,node_modules,.gradle,build,out,target,.idea}/**';

export function inferNamespaceFromPath(pathNorm: string, marker: '/data/' | '/assets/'): string | undefined {
  const index = pathNorm.indexOf(marker);
  if (index === -1) {
    return undefined;
  }

  const after = pathNorm.slice(index + marker.length);
  const namespace = after.split('/', 1)[0];
  return namespace || undefined;
}

export function normalizeResourceId(raw: string, namespace: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.includes(':')) {
    return trimmed;
  }
  return `${namespace}:${trimmed}`;
}

export function normalizeSlug(value: string): string {
  return value.replace(/[^a-z0-9]/g, '').toLowerCase();
}

export function normalizePath(value: string): string {
  return value.replace(/\\/g, '/');
}

export function getStringProperty(obj: Record<string, unknown>, key: string): string | undefined {
  const value = obj[key];
  return typeof value === 'string' ? value : undefined;
}

export function toAssetResourceId(filePath: string): string | undefined {
  const normalized = normalizePath(filePath);
  const match = normalized.match(/\/assets\/([^/]+)\/(.+)$/);
  if (!match) {
    return undefined;
  }

  return `${match[1]}:${match[2]}`.toLowerCase();
}

export function toModelResourceId(filePath: string): string | undefined {
  const normalized = normalizePath(filePath);
  if (!normalized.endsWith('.geo.json')) {
    return undefined;
  }

  const namespace = inferNamespaceFromPath(normalized, '/assets/');
  if (!namespace || !/\/bedrock\/.+\/models\//.test(normalized) && !/\/bedrock\/models\//.test(normalized)) {
    return undefined;
  }

  const fileName = path.basename(normalized, '.json');
  return `${namespace}:${fileName}`.toLowerCase();
}

export function toAnimationGroupName(filePath: string): string | undefined {
  const normalized = normalizePath(filePath);
  if (!normalized.endsWith('.animation.json')) {
    return undefined;
  }

  if (!/\/assets\/[^/]+\/bedrock\//.test(normalized)) {
    return undefined;
  }

  return path.basename(normalized).replace(/\.animation\.json$/, '').toLowerCase();
}

export function strictNamingSeverity(): vscode.DiagnosticSeverity {
  const strict = vscode.workspace.getConfiguration('cobblemonSchemaTools').get<boolean>('strictAssetNaming', false);
  return strict || isStrictWorkspaceValidationEnabled()
    ? vscode.DiagnosticSeverity.Error
    : vscode.DiagnosticSeverity.Warning;
}

export function workspaceWarningSeverity(): vscode.DiagnosticSeverity {
  return isStrictWorkspaceValidationEnabled()
    ? vscode.DiagnosticSeverity.Error
    : vscode.DiagnosticSeverity.Warning;
}

export function isValidationEnabled(): boolean {
  return vscode.workspace.getConfiguration('cobblemonSchemaTools').get<boolean>('enableWorkspaceValidation', true);
}

export function isPokemonAssetFolderNamingWarningEnabled(): boolean {
  return vscode.workspace.getConfiguration('cobblemonSchemaTools').get<boolean>('warnOnPokemonAssetFolderNaming', true);
}

function isStrictWorkspaceValidationEnabled(): boolean {
  return vscode.workspace.getConfiguration('cobblemonSchemaTools').get<boolean>('strictWorkspaceValidation', true);
}
