"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.scaffoldPokemonAssetsCommand = void 0;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const command_utils_1 = require("./command-utils");
const utils_1 = require("../core/utils");
const lang_utils_1 = require("./lang-utils");
const types_1 = require("./pokemon-builder/types");
const form_validation_1 = require("./pokemon-builder/form-validation");
const webview_1 = require("./pokemon-builder/webview");
const templates_1 = require("./pokemon-builder/templates");
exports.scaffoldPokemonAssetsCommand = {
    id: 'cobblemonSchemaTools.scaffoldPokemonAssets',
    run: async ({ scheduleValidation }) => {
        await scaffoldPokemonAssets();
        scheduleValidation();
    },
};
async function scaffoldPokemonAssets() {
    const folder = await (0, command_utils_1.pickWorkspaceFolder)();
    if (!folder) {
        return;
    }
    const formData = await (0, webview_1.showPokemonBuilderForm)(types_1.DEFAULT_POKEMON_BUILDER_FORM);
    if (!formData) {
        return;
    }
    const validationError = (0, form_validation_1.validatePokemonBuilderFormData)(formData);
    if (validationError) {
        void vscode.window.showErrorMessage(validationError);
        return;
    }
    const namespace = formData.namespace.trim().toLowerCase();
    const speciesName = formData.speciesName.trim();
    const speciesId = formData.speciesId.trim().toLowerCase();
    const dexRaw = formData.dexNumber.trim();
    const dexNumber = Number.parseInt(dexRaw, 10);
    const primaryType = formData.primaryType.trim().toLowerCase();
    const secondaryType = formData.secondaryType.trim().toLowerCase() || undefined;
    const speciesSubfolder = formData.speciesSubfolder.trim();
    const dexEntryGroup = formData.dexEntryGroup.trim();
    const featureKeys = formData.includeFeatures ? (0, command_utils_1.parseCsvIdentifiers)(formData.featureKeys) : [];
    const dex = dexRaw.padStart(4, '0');
    const folderName = `${dex}_${speciesId}`;
    const templateArgs = {
        namespace,
        speciesId,
        speciesName,
        dexNumber,
        folderName,
        primaryType,
        secondaryType,
        includeFlight: formData.includeFlight,
        includeSwim: formData.includeSwim,
        includeMountLand: formData.includeMountLand,
        includeMountAir: formData.includeMountAir,
        includeMountLiquid: formData.includeMountLiquid,
        includeShiny: formData.includeShiny,
        featureKeys,
    };
    const assetsRoot = vscode.Uri.joinPath(folder.uri, 'assets', namespace, 'bedrock', 'pokemon');
    const poserDir = vscode.Uri.joinPath(assetsRoot, 'posers', folderName);
    const resolverDir = vscode.Uri.joinPath(assetsRoot, 'resolvers', folderName);
    await vscode.workspace.fs.createDirectory(poserDir);
    await vscode.workspace.fs.createDirectory(resolverDir);
    const poserUri = vscode.Uri.joinPath(poserDir, `${speciesId}.json`);
    const resolverUri = vscode.Uri.joinPath(resolverDir, `0_${speciesId}_base.json`);
    const speciesBaseDir = vscode.Uri.joinPath(folder.uri, 'data', namespace, 'species');
    const speciesDir = (0, command_utils_1.appendRelativePath)(speciesBaseDir, speciesSubfolder);
    await vscode.workspace.fs.createDirectory(speciesDir);
    const speciesUri = vscode.Uri.joinPath(speciesDir, `${speciesId}.json`);
    const createdUris = [speciesUri, resolverUri, poserUri];
    await (0, command_utils_1.writeFileIfMissing)(speciesUri, JSON.stringify((0, templates_1.buildPokemonSpeciesTemplate)(templateArgs), null, 2) + '\n');
    await (0, command_utils_1.writeFileIfMissing)(resolverUri, JSON.stringify((0, templates_1.buildPokemonResolverTemplate)(templateArgs), null, 2) + '\n');
    await (0, command_utils_1.writeFileIfMissing)(poserUri, JSON.stringify((0, templates_1.buildPokemonPoserTemplate)(templateArgs), null, 2) + '\n');
    if (formData.includeLangData) {
        const langCode = formData.langCode.trim().toLowerCase();
        const langDescription = formData.langDescription.trim() || `TODO: Add Pokedex description for ${speciesName}.`;
        const langUri = await (0, lang_utils_1.upsertSpeciesLangEntries)(folder.uri, namespace, speciesId, speciesName, langDescription, langCode);
        if (langUri) {
            createdUris.push(langUri);
        }
    }
    if (formData.includeDexData) {
        const normalizedDexId = (0, utils_1.normalizeResourceId)(formData.dexAdditionDexId.trim().toLowerCase(), namespace);
        const dexEntryDir = (0, command_utils_1.appendRelativePath)(vscode.Uri.joinPath(folder.uri, 'data', namespace, 'dex_entries'), dexEntryGroup);
        await vscode.workspace.fs.createDirectory(dexEntryDir);
        const dexEntryUri = vscode.Uri.joinPath(dexEntryDir, `${speciesId}.json`);
        createdUris.push(dexEntryUri);
        await (0, command_utils_1.writeFileIfMissing)(dexEntryUri, JSON.stringify({
            id: `${namespace}:${speciesId}`,
            speciesId: `${namespace}:${speciesId}`,
            displayAspects: [],
            conditionAspects: [],
            forms: [
                {
                    displayForm: 'Normal',
                    unlockForms: ['Normal'],
                },
            ],
            variations: [],
        }, null, 2) + '\n');
        const dexAdditionsDir = vscode.Uri.joinPath(folder.uri, 'data', namespace, 'dex_additions');
        await vscode.workspace.fs.createDirectory(dexAdditionsDir);
        const dexAdditionFileKey = (0, command_utils_1.sanitizeFileComponent)(normalizedDexId);
        const dexAdditionUri = vscode.Uri.joinPath(dexAdditionsDir, `${speciesId}_${dexAdditionFileKey}.json`);
        createdUris.push(dexAdditionUri);
        await (0, command_utils_1.writeFileIfMissing)(dexAdditionUri, JSON.stringify({
            dexId: normalizedDexId,
            entries: [`${namespace}:${speciesId}`],
        }, null, 2) + '\n');
    }
    if (featureKeys.length > 0) {
        const featuresDir = vscode.Uri.joinPath(folder.uri, 'data', namespace, 'species_features');
        const assignmentsDir = vscode.Uri.joinPath(folder.uri, 'data', namespace, 'species_feature_assignments');
        await vscode.workspace.fs.createDirectory(featuresDir);
        await vscode.workspace.fs.createDirectory(assignmentsDir);
        for (const key of featureKeys) {
            const providerUri = vscode.Uri.joinPath(featuresDir, `${key}.json`);
            const providerTemplate = {
                type: 'flag',
                keys: [key],
                default: false,
                visible: true,
            };
            createdUris.push(providerUri);
            await (0, command_utils_1.writeFileIfMissing)(providerUri, JSON.stringify(providerTemplate, null, 2) + '\n');
        }
        const assignmentUri = vscode.Uri.joinPath(assignmentsDir, `${speciesId}_features.json`);
        createdUris.push(assignmentUri);
        await (0, command_utils_1.writeFileIfMissing)(assignmentUri, JSON.stringify({
            pokemon: [`${namespace}:${speciesId}`],
            features: featureKeys,
        }, null, 2) + '\n');
    }
    if (formData.includeSpeciesAddition) {
        const additionsDir = vscode.Uri.joinPath(folder.uri, 'data', namespace, 'species_additions');
        await vscode.workspace.fs.createDirectory(additionsDir);
        const additionsUri = vscode.Uri.joinPath(additionsDir, `${speciesId}_builder_patch.json`);
        createdUris.push(additionsUri);
        await (0, command_utils_1.writeFileIfMissing)(additionsUri, JSON.stringify({
            target: `${namespace}:${speciesId}`,
            features: featureKeys,
        }, null, 2) + '\n');
    }
    void vscode.window.showInformationMessage(`Pokemon builder generated templates for ${namespace}:${speciesId}.`);
    const openChoice = await vscode.window.showQuickPick(createdUris.map((uri) => ({
        label: path.relative(folder.uri.fsPath, uri.fsPath),
        description: uri.fsPath,
        uri,
    })), {
        title: 'Pokemon Builder Output',
        placeHolder: 'Select a generated file to open (or press Escape).',
    });
    if (openChoice) {
        const doc = await vscode.workspace.openTextDocument(openChoice.uri);
        await vscode.window.showTextDocument(doc);
    }
}
//# sourceMappingURL=pokemon-builder.command.js.map