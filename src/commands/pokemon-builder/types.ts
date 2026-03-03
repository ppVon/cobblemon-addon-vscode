export interface PokemonBuilderTemplateArgs {
  namespace: string;
  speciesId: string;
  speciesName: string;
  dexNumber: number;
  folderName: string;
  primaryType: string;
  secondaryType?: string;
  includeFlight: boolean;
  includeSwim: boolean;
  includeMountLand: boolean;
  includeMountAir: boolean;
  includeMountLiquid: boolean;
  includeShiny: boolean;
  featureKeys: string[];
}

export interface PokemonBuilderFormData {
  namespace: string;
  speciesName: string;
  speciesId: string;
  dexNumber: string;
  primaryType: string;
  secondaryType: string;
  speciesSubfolder: string;
  includeShiny: boolean;
  includeFlight: boolean;
  includeSwim: boolean;
  includeMountLand: boolean;
  includeMountAir: boolean;
  includeMountLiquid: boolean;
  includeFeatures: boolean;
  includeSpeciesAddition: boolean;
  includeDexData: boolean;
  includeLangData: boolean;
  dexEntryGroup: string;
  dexAdditionDexId: string;
  langCode: string;
  langDescription: string;
  featureKeys: string;
}

export const COBBLEMON_TYPES = [
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
] as const;

export const COBBLEMON_TYPE_SET = new Set<string>(COBBLEMON_TYPES);

export const DEFAULT_POKEMON_BUILDER_FORM: PokemonBuilderFormData = {
  namespace: 'cobblemon',
  speciesName: 'Bulbasaur',
  speciesId: 'bulbasaur',
  dexNumber: '9000',
  primaryType: 'normal',
  secondaryType: '',
  speciesSubfolder: '',
  includeShiny: true,
  includeFlight: false,
  includeSwim: false,
  includeMountLand: false,
  includeMountAir: false,
  includeMountLiquid: false,
  includeFeatures: false,
  includeSpeciesAddition: false,
  includeDexData: true,
  includeLangData: true,
  dexEntryGroup: 'pokemon/custom',
  dexAdditionDexId: 'cobblemon:national',
  langCode: 'en_us',
  langDescription: '',
  featureKeys: '',
};
