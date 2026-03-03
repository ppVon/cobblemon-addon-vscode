"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_POKEMON_BUILDER_FORM = exports.COBBLEMON_TYPE_SET = exports.COBBLEMON_TYPES = void 0;
exports.COBBLEMON_TYPES = [
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
];
exports.COBBLEMON_TYPE_SET = new Set(exports.COBBLEMON_TYPES);
exports.DEFAULT_POKEMON_BUILDER_FORM = {
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
//# sourceMappingURL=types.js.map