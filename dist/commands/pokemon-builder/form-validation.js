"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePokemonBuilderFormData = validatePokemonBuilderFormData;
exports.isPokemonBuilderFormData = isPokemonBuilderFormData;
const command_utils_1 = require("../command-utils");
const types_1 = require("./types");
function validatePokemonBuilderFormData(data) {
    if (!/^[a-z0-9_.-]+$/.test(data.namespace.trim())) {
        return 'Namespace must use lowercase namespace characters.';
    }
    if (!/^[A-Za-z0-9_.-]+$/.test(data.speciesName.trim())) {
        return 'Species name must use letters, numbers, dots, underscores, or hyphens.';
    }
    if (!/^[a-z0-9_.-]+$/.test(data.speciesId.trim())) {
        return 'Species id must use lowercase id characters.';
    }
    if (!/^[0-9]{1,4}$/.test(data.dexNumber.trim())) {
        return 'Dex number must be a 1-4 digit number.';
    }
    const dexNumber = Number.parseInt(data.dexNumber.trim(), 10);
    if (!Number.isFinite(dexNumber) || dexNumber < 1) {
        return 'Dex number must be a positive integer.';
    }
    const primaryType = data.primaryType.trim();
    if (!types_1.COBBLEMON_TYPE_SET.has(primaryType)) {
        return 'Primary type must be one of the supported Cobblemon types.';
    }
    const secondaryType = data.secondaryType.trim();
    if (secondaryType.length > 0 && !types_1.COBBLEMON_TYPE_SET.has(secondaryType)) {
        return 'Secondary type must be a supported Cobblemon type or empty.';
    }
    const subfolder = data.speciesSubfolder.trim();
    if (subfolder.length > 0) {
        if (subfolder.includes('..') || subfolder.startsWith('/') || subfolder.endsWith('/')) {
            return 'Species subfolder must be a relative path without ".." or leading/trailing slash.';
        }
        if (!/^[a-z0-9_./-]+$/.test(subfolder)) {
            return 'Species subfolder must use lowercase path segments.';
        }
    }
    if (data.includeDexData) {
        const dexEntryGroup = data.dexEntryGroup.trim();
        if (!dexEntryGroup) {
            return 'Dex entry group is required when dex generation is enabled.';
        }
        if (dexEntryGroup.includes('..') || dexEntryGroup.startsWith('/') || dexEntryGroup.endsWith('/')) {
            return 'Dex entry group must be a relative path without ".." or leading/trailing slash.';
        }
        if (!/^[a-z0-9_./-]+$/.test(dexEntryGroup)) {
            return 'Dex entry group must use lowercase path segments.';
        }
        const dexId = data.dexAdditionDexId.trim().toLowerCase();
        if (!/^(?:[a-z0-9_.-]+:)?[a-z0-9_./-]+$/.test(dexId)) {
            return 'Dex id must be a valid identifier (e.g. cobblemon:national).';
        }
    }
    if (data.includeLangData) {
        const langCode = data.langCode.trim().toLowerCase();
        if (!/^[a-z0-9_]+$/.test(langCode)) {
            return 'Lang code must use lowercase letters/numbers/underscores (e.g. en_us).';
        }
    }
    if (data.includeFeatures) {
        const keys = (0, command_utils_1.parseCsvIdentifiers)(data.featureKeys);
        if (keys.length === 0) {
            return 'Feature support is enabled but no feature keys were provided.';
        }
        if (!keys.every((key) => /^[a-z0-9_.-]+$/.test(key))) {
            return 'Feature keys must be lowercase identifiers.';
        }
    }
    return undefined;
}
function isPokemonBuilderFormData(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }
    const obj = value;
    return typeof obj.namespace === 'string'
        && typeof obj.speciesName === 'string'
        && typeof obj.speciesId === 'string'
        && typeof obj.dexNumber === 'string'
        && typeof obj.primaryType === 'string'
        && typeof obj.secondaryType === 'string'
        && typeof obj.speciesSubfolder === 'string'
        && typeof obj.includeShiny === 'boolean'
        && typeof obj.includeFlight === 'boolean'
        && typeof obj.includeSwim === 'boolean'
        && typeof obj.includeMountLand === 'boolean'
        && typeof obj.includeMountAir === 'boolean'
        && typeof obj.includeMountLiquid === 'boolean'
        && typeof obj.includeFeatures === 'boolean'
        && typeof obj.includeSpeciesAddition === 'boolean'
        && typeof obj.includeDexData === 'boolean'
        && typeof obj.includeLangData === 'boolean'
        && typeof obj.dexEntryGroup === 'string'
        && typeof obj.dexAdditionDexId === 'string'
        && typeof obj.langCode === 'string'
        && typeof obj.langDescription === 'string'
        && typeof obj.featureKeys === 'string';
}
//# sourceMappingURL=form-validation.js.map