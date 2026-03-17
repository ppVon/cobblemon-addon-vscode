import * as fs from 'node:fs';
import * as path from 'node:path';

interface CobblemonDefaultDataIndexFile {
  speciesIds?: string[];
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
  readonly poserIds: ReadonlySet<string>;
  readonly modelIds: ReadonlySet<string>;
  readonly animationGroupNames: ReadonlySet<string>;
  readonly textureIds: ReadonlySet<string>;
  readonly langKeys: ReadonlySet<string>;
}

let cachedIndex: CobblemonDefaultResourceIndex | undefined;

export function getCobblemonDefaultResourceIndex(): CobblemonDefaultResourceIndex {
  if (cachedIndex) {
    return cachedIndex;
  }

  const dataIndex = readIndexFile<CobblemonDefaultDataIndexFile>('cobblemon-default-data-index.json');
  const assetsIndex = readIndexFile<CobblemonDefaultAssetsIndexFile>('cobblemon-default-assets-index.json');

  cachedIndex = {
    speciesIds: new Set(dataIndex.speciesIds ?? []),
    poserIds: new Set(assetsIndex.poserIds ?? []),
    modelIds: new Set(assetsIndex.modelIds ?? []),
    animationGroupNames: new Set(assetsIndex.animationGroupNames ?? []),
    textureIds: new Set(assetsIndex.textureIds ?? []),
    langKeys: new Set(assetsIndex.langKeys ?? []),
  };

  return cachedIndex;
}

function readIndexFile<T>(fileName: string): T {
  const indexPath = path.resolve(__dirname, '../../schemas/generated', fileName);

  try {
    const raw = fs.readFileSync(indexPath, 'utf8');
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`[cobblemon-schema-tools] Failed to load bundled Cobblemon index '${fileName}':`, error);
    return {} as T;
  }
}
