import * as path from 'path';
import * as vscode from 'vscode';
import { parseWorkspaceJson } from '../core/json';
import {
  DATA_ROOT_EXCLUDE,
  getStringProperty,
  inferNamespaceFromPath,
  normalizePath,
  normalizeResourceId,
} from '../core/utils';
import { type WorkspaceSpeciesRecord } from '../types';
import { sanitizeFileComponent } from './command-utils';

export async function collectWorkspaceSpecies(workspaceRoot: vscode.Uri): Promise<WorkspaceSpeciesRecord[]> {
  const files = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceRoot, 'data/*/species/**/*.json'), DATA_ROOT_EXCLUDE);
  const records: WorkspaceSpeciesRecord[] = [];
  const identifierPattern = /^(?:[a-z0-9_.-]+:)?[a-z0-9_./-]+$/i;

  for (const uri of files) {
    const parsed = await parseWorkspaceJson(uri);
    if (parsed.parseErrors.length > 0 || !parsed.value || typeof parsed.value !== 'object' || Array.isArray(parsed.value)) {
      continue;
    }

    const obj = parsed.value as Record<string, unknown>;
    const normalizedPath = normalizePath(uri.fsPath);
    const namespace = inferNamespaceFromPath(normalizedPath, '/data/') ?? 'minecraft';
    const fileStem = path.basename(uri.fsPath, '.json');
    const fileSlug = sanitizeFileComponent(fileStem);

    const rawName = getStringProperty(obj, 'name')?.trim() ?? '';
    const speciesId = rawName.length > 0 && identifierPattern.test(rawName)
      ? normalizeResourceId(rawName, namespace)
      : normalizeResourceId(fileSlug, namespace);

    const speciesPath = speciesId.split(':', 2)[1] ?? speciesId;
    const displayName = rawName.length > 0 ? rawName : fileStem;
    const dexRaw = obj.nationalPokedexNumber;
    const dexNumber = typeof dexRaw === 'number' && Number.isFinite(dexRaw) ? Math.trunc(dexRaw) : undefined;

    records.push({
      id: speciesId,
      namespace,
      slug: sanitizeFileComponent(speciesPath.replace(/\//g, '_')),
      displayName,
      dexNumber: dexNumber && dexNumber > 0 ? dexNumber : undefined,
      uri,
    });
  }

  return records.sort((a, b) => {
    const dexA = a.dexNumber ?? Number.POSITIVE_INFINITY;
    const dexB = b.dexNumber ?? Number.POSITIVE_INFINITY;
    if (dexA !== dexB) {
      return dexA - dexB;
    }
    return a.id.localeCompare(b.id);
  });
}

export function buildSpawnPoolWorldTemplate(species: WorkspaceSpeciesRecord): Record<string, unknown> {
  return {
    comment: `Generated spawn pool template for ${species.id}`,
    enabled: true,
    neededInstalledMods: [],
    neededUninstalledMods: [],
    spawns: [
      {
        id: `${species.slug}-1`,
        pokemon: species.id,
        type: 'pokemon',
        spawnablePositionType: 'grounded',
        bucket: 'common',
        level: '1-20',
        weight: 1.0,
      },
    ],
  };
}
