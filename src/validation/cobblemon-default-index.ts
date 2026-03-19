import * as fs from 'node:fs';
import * as vscode from 'vscode';

interface CobblemonDefaultDataIndexFile {
  speciesIds?: string[];
  dexEntryIds?: string[];
}

interface CobblemonDefaultAssetsIndexFile {
  poserIds?: string[];
  modelIds?: string[];
  animationGroupNames?: string[];
  textureIds?: string[];
  langKeys?: string[];
}

export interface CobblemonDefaultResourceIndex {
  readonly speciesIds: ReadonlySet<string>;
  readonly dexEntryIds: ReadonlySet<string>;
  readonly poserIds: ReadonlySet<string>;
  readonly modelIds: ReadonlySet<string>;
  readonly animationGroupNames: ReadonlySet<string>;
  readonly textureIds: ReadonlySet<string>;
  readonly langKeys: ReadonlySet<string>;
}

const cachedIndices = new Map<string, CobblemonDefaultResourceIndex>();

export function getCobblemonDefaultResourceIndex(extensionUri: vscode.Uri): CobblemonDefaultResourceIndex {
  const cacheKey = extensionUri.toString();
  const cachedIndex = cachedIndices.get(cacheKey);
  if (cachedIndex) {
    return cachedIndex;
  }

  const dataIndex = readIndexFile<CobblemonDefaultDataIndexFile>(extensionUri, 'cobblemon-default-data-index.json');
  const assetsIndex = readIndexFile<CobblemonDefaultAssetsIndexFile>(extensionUri, 'cobblemon-default-assets-index.json');

  const index = {
    speciesIds: new Set(dataIndex.speciesIds ?? []),
    dexEntryIds: new Set(dataIndex.dexEntryIds ?? []),
    poserIds: new Set(assetsIndex.poserIds ?? []),
    modelIds: new Set(assetsIndex.modelIds ?? []),
    animationGroupNames: new Set(assetsIndex.animationGroupNames ?? []),
    textureIds: new Set(assetsIndex.textureIds ?? []),
    langKeys: new Set(assetsIndex.langKeys ?? []),
  };

  cachedIndices.set(cacheKey, index);
  return index;
}

function readIndexFile<T>(extensionUri: vscode.Uri, fileName: string): T {
  const indexUri = vscode.Uri.joinPath(extensionUri, 'schemas', 'generated', fileName);

  try {
    const raw = fs.readFileSync(indexUri.fsPath, 'utf8');
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`[cobblemon-schema-tools] Failed to load bundled Cobblemon index '${fileName}':`, error);
    return {} as T;
  }
}
