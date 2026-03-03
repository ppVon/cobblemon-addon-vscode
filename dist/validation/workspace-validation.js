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
exports.runWorkspaceValidation = runWorkspaceValidation;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const json_1 = require("../core/json");
const utils_1 = require("../core/utils");
const diagnostics_1 = require("../core/diagnostics");
async function runWorkspaceValidation(engine, diagnostics, notifySuccess = false) {
    const files = await vscode.workspace.findFiles('**/*.json', utils_1.DATA_ROOT_EXCLUDE);
    const textureFiles = await vscode.workspace.findFiles('**/assets/*/**/*.png', utils_1.DATA_ROOT_EXCLUDE);
    const langFiles = await vscode.workspace.findFiles('**/assets/*/lang/*.json', utils_1.DATA_ROOT_EXCLUDE);
    const byUri = new Map();
    const speciesIds = new Map();
    const poserIds = new Map();
    const referencedPosers = new Set();
    const modelIds = new Set();
    const animationGroupNames = new Set();
    const textureIds = new Set();
    const langKeys = new Set();
    const langRequirements = [];
    const resolverRecords = [];
    const poserRecords = [];
    for (const textureUri of textureFiles) {
        const textureId = (0, utils_1.toAssetResourceId)(textureUri.fsPath);
        if (textureId) {
            textureIds.add(textureId);
        }
    }
    for (const langUri of langFiles) {
        const parsed = await (0, json_1.parseWorkspaceJson)(langUri);
        if (parsed.parseErrors.length > 0) {
            (0, diagnostics_1.addDiagnostics)(byUri, langUri, (0, diagnostics_1.createParseDiagnostics)(parsed));
            continue;
        }
        if (!parsed.value || typeof parsed.value !== 'object' || Array.isArray(parsed.value)) {
            continue;
        }
        for (const [key, value] of Object.entries(parsed.value)) {
            if (typeof value === 'string') {
                langKeys.add(key);
            }
        }
    }
    for (const uri of files) {
        const filePath = uri.fsPath;
        const normalized = (0, utils_1.normalizePath)(filePath);
        const modelId = (0, utils_1.toModelResourceId)(normalized);
        if (modelId) {
            modelIds.add(modelId);
        }
        const animationGroup = (0, utils_1.toAnimationGroupName)(normalized);
        if (animationGroup) {
            animationGroupNames.add(animationGroup);
            const animationNamespace = (0, utils_1.inferNamespaceFromPath)(normalized, '/assets/');
            if (animationNamespace) {
                animationGroupNames.add(`${animationNamespace}:${animationGroup}`);
            }
        }
        const resolution = engine.getSchemaForPath(filePath);
        if (!resolution) {
            continue;
        }
        const parsed = await (0, json_1.parseWorkspaceJson)(uri);
        const schemaDiagnostics = engine.validateJsonFile(parsed, resolution.schemaPath);
        (0, diagnostics_1.addDiagnostics)(byUri, uri, schemaDiagnostics);
        if (parsed.parseErrors.length > 0 || !parsed.value || typeof parsed.value !== 'object' || Array.isArray(parsed.value)) {
            continue;
        }
        const namespace = (0, utils_1.inferNamespaceFromPath)(normalized, '/data/') ?? (0, utils_1.inferNamespaceFromPath)(normalized, '/assets/') ?? 'minecraft';
        const parsedObject = parsed.value;
        if (resolution.schemaPath === 'schemas/species/schema.json') {
            const name = (0, utils_1.getStringProperty)(parsedObject, 'name');
            if (name) {
                const speciesId = (0, utils_1.normalizeResourceId)(name, namespace);
                speciesIds.set(speciesId, uri);
                const speciesSlug = speciesId.split(':', 2)[1] ?? speciesId;
                langRequirements.push({
                    parsed,
                    key: `${namespace}.species.${speciesSlug}.name`,
                    pointer: ['name'],
                });
            }
            const pokedex = Array.isArray(parsedObject.pokedex) ? parsedObject.pokedex : [];
            for (let i = 0; i < pokedex.length; i++) {
                const entry = pokedex[i];
                if (typeof entry !== 'string') {
                    continue;
                }
                langRequirements.push({
                    parsed,
                    key: entry,
                    pointer: ['pokedex', i],
                });
            }
        }
        if (resolution.schemaPath === 'schemas/bedrock_pokemon_resolvers/schema.json') {
            resolverRecords.push({ parsed, namespace, pathNorm: normalized });
        }
        if (resolution.schemaPath === 'schemas/bedrock_posers/schema.json') {
            const fileStem = path.basename(normalized, '.json');
            const poserId = (0, utils_1.normalizeResourceId)(fileStem, namespace);
            const isPokemonPoser = /\/assets\/[^/]+\/bedrock\/pokemon\/posers\//.test(normalized);
            const current = poserIds.get(poserId) ?? [];
            current.push(uri);
            poserIds.set(poserId, current);
            poserRecords.push({ parsed, namespace, pathNorm: normalized, poserId, isPokemonPoser });
        }
    }
    for (const record of resolverRecords) {
        const diags = validateResolverRecord(record, speciesIds, poserIds, modelIds, textureIds, referencedPosers);
        (0, diagnostics_1.addDiagnostics)(byUri, record.parsed.uri, diags);
    }
    for (const record of poserRecords) {
        const diags = validatePoserRecord(record, referencedPosers, animationGroupNames);
        (0, diagnostics_1.addDiagnostics)(byUri, record.parsed.uri, diags);
    }
    for (const [poserId, uris] of poserIds.entries()) {
        if (uris.length < 2) {
            continue;
        }
        for (const uri of uris) {
            (0, diagnostics_1.addDiagnostics)(byUri, uri, [
                new vscode.Diagnostic(new vscode.Range(0, 0, 0, 1), `Poser id '${poserId}' is defined by multiple files. Resolver links may resolve unpredictably.`, (0, utils_1.strictNamingSeverity)()),
            ]);
        }
    }
    for (const requirement of langRequirements) {
        if (langKeys.has(requirement.key)) {
            continue;
        }
        (0, diagnostics_1.addDiagnostics)(byUri, requirement.parsed.uri, [
            (0, diagnostics_1.createCustomDiagnostic)(requirement.parsed, `Lang key '${requirement.key}' was not found in any assets/*/lang/*.json file.`, (0, utils_1.workspaceWarningSeverity)(), requirement.pointer),
        ]);
    }
    diagnostics.clear();
    for (const [uriString, diags] of byUri.entries()) {
        diagnostics.set(vscode.Uri.parse(uriString), diags);
    }
    if (notifySuccess) {
        const filesWithIssues = Array.from(byUri.values()).filter((x) => x.length > 0).length;
        if (filesWithIssues > 0) {
            void vscode.window.showWarningMessage(`Cobblemon validation finished with issues in ${filesWithIssues} file(s).`);
        }
        else {
            void vscode.window.showInformationMessage('Cobblemon validation finished with no issues.');
        }
    }
}
function validateResolverRecord(record, speciesIds, poserIds, modelIds, textureIds, referencedPosers) {
    const diagnostics = [];
    const value = record.parsed.value;
    const fileName = path.basename(record.pathNorm, '.json');
    const dirName = path.basename(path.dirname(record.pathNorm));
    if (!/^[0-9]+_[a-z0-9_-]+$/.test(fileName)) {
        diagnostics.push(new vscode.Diagnostic(new vscode.Range(0, 0, 0, 1), 'Resolver filename should use <order>_<name>.json.', (0, utils_1.strictNamingSeverity)()));
    }
    if (!/^[0-9]{3,4}_[a-z0-9_-]+$/.test(dirName)) {
        diagnostics.push(new vscode.Diagnostic(new vscode.Range(0, 0, 0, 1), 'Resolver directory should usually use <dex>_<species>.', (0, utils_1.strictNamingSeverity)()));
    }
    const order = typeof value.order === 'number' ? value.order : undefined;
    const prefix = Number.parseInt(fileName.split('_', 1)[0] ?? '', 10);
    if (Number.isFinite(prefix) && order !== undefined && prefix !== order) {
        diagnostics.push((0, diagnostics_1.createCustomDiagnostic)(record.parsed, `Filename order prefix (${prefix}) does not match JSON 'order' (${order}).`, (0, utils_1.strictNamingSeverity)(), ['order']));
    }
    const speciesRaw = (0, utils_1.getStringProperty)(value, 'species') ?? (0, utils_1.getStringProperty)(value, 'name') ?? (0, utils_1.getStringProperty)(value, 'pokeball');
    if (speciesRaw) {
        const speciesId = (0, utils_1.normalizeResourceId)(speciesRaw, record.namespace);
        const speciesSlug = speciesId.split(':', 2)[1] ?? speciesId;
        if (!(0, utils_1.normalizeSlug)(fileName).includes((0, utils_1.normalizeSlug)(speciesSlug))) {
            diagnostics.push(new vscode.Diagnostic(new vscode.Range(0, 0, 0, 1), `Resolver filename does not include species slug '${speciesSlug}'.`, (0, utils_1.strictNamingSeverity)()));
        }
        if (!speciesIds.has(speciesId)) {
            diagnostics.push((0, diagnostics_1.createCustomDiagnostic)(record.parsed, `Species id '${speciesId}' was not found in any species data file.`, (0, utils_1.workspaceWarningSeverity)(), ['species']));
        }
    }
    const variations = Array.isArray(value.variations) ? value.variations : [];
    for (let i = 0; i < variations.length; i++) {
        const variation = variations[i];
        if (!variation || typeof variation !== 'object' || Array.isArray(variation)) {
            continue;
        }
        const variationObj = variation;
        const poser = (0, utils_1.getStringProperty)(variationObj, 'poser');
        if (poser) {
            const poserId = (0, utils_1.normalizeResourceId)(poser, record.namespace);
            referencedPosers.add(poserId);
            if (!poserIds.has(poserId)) {
                diagnostics.push((0, diagnostics_1.createCustomDiagnostic)(record.parsed, `Referenced poser '${poserId}' does not exist.`, vscode.DiagnosticSeverity.Error, ['variations', i, 'poser']));
            }
        }
        const model = (0, utils_1.getStringProperty)(variationObj, 'model');
        if (model) {
            const modelId = (0, utils_1.normalizeResourceId)(model, record.namespace);
            if (!modelIds.has(modelId)) {
                diagnostics.push((0, diagnostics_1.createCustomDiagnostic)(record.parsed, `Referenced model '${modelId}' does not exist under assets/*/bedrock/**/models.`, vscode.DiagnosticSeverity.Error, ['variations', i, 'model']));
            }
        }
        const texture = variationObj.texture;
        diagnostics.push(...validateTextureRef(record.parsed, texture, record.namespace, textureIds, ['variations', i, 'texture']));
        const layers = Array.isArray(variationObj.layers) ? variationObj.layers : [];
        for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
            const layer = layers[layerIndex];
            if (!layer || typeof layer !== 'object' || Array.isArray(layer)) {
                continue;
            }
            const layerTexture = layer.texture;
            diagnostics.push(...validateTextureRef(record.parsed, layerTexture, record.namespace, textureIds, ['variations', i, 'layers', layerIndex, 'texture']));
        }
    }
    return diagnostics;
}
function validatePoserRecord(record, referencedPosers, animationGroupNames) {
    const diagnostics = [];
    const fileStem = path.basename(record.pathNorm, '.json');
    if (record.isPokemonPoser) {
        const dirName = path.basename(path.dirname(record.pathNorm));
        if (dirName !== 'special' && !/^[0-9]{3,4}_[a-z0-9_-]+$/.test(dirName)) {
            diagnostics.push(new vscode.Diagnostic(new vscode.Range(0, 0, 0, 1), 'Pokemon poser directory should usually use <dex>_<species>.', (0, utils_1.strictNamingSeverity)()));
        }
        if (!/^[a-z0-9_-]+$/.test(fileStem)) {
            diagnostics.push(new vscode.Diagnostic(new vscode.Range(0, 0, 0, 1), 'Pokemon poser filename should use lowercase snake/kebab case.', (0, utils_1.strictNamingSeverity)()));
        }
        const inSpecial = /\/bedrock\/pokemon\/posers\/special\//.test(record.pathNorm);
        if (!inSpecial && !referencedPosers.has(record.poserId)) {
            diagnostics.push(new vscode.Diagnostic(new vscode.Range(0, 0, 0, 1), `Poser '${record.poserId}' is not referenced by any pokemon resolver variation.`, (0, utils_1.workspaceWarningSeverity)()));
        }
    }
    const groups = extractBedrockGroups(record.parsed.value);
    for (const group of groups) {
        const normalizedGroup = (0, utils_1.normalizeResourceId)(group, record.namespace);
        const shortGroup = normalizedGroup.split(':', 2)[1] ?? normalizedGroup;
        if (!animationGroupNames.has(shortGroup) && !animationGroupNames.has(normalizedGroup)) {
            diagnostics.push(new vscode.Diagnostic(new vscode.Range(0, 0, 0, 1), `Animation group '${group}' referenced by poser '${record.poserId}' was not found in assets/*/bedrock/**/animations/*.animation.json.`, (0, utils_1.workspaceWarningSeverity)()));
        }
    }
    return diagnostics;
}
function validateTextureRef(parsed, textureValue, namespace, textureIds, pointer) {
    const diagnostics = [];
    if (typeof textureValue === 'string') {
        if (textureValue === 'variable') {
            return diagnostics;
        }
        const id = (0, utils_1.normalizeResourceId)(textureValue, namespace);
        if (!textureIds.has(id)) {
            diagnostics.push((0, diagnostics_1.createCustomDiagnostic)(parsed, `Texture '${id}' does not exist in assets/${namespace}.`, (0, utils_1.workspaceWarningSeverity)(), pointer));
        }
        return diagnostics;
    }
    if (!textureValue || typeof textureValue !== 'object' || Array.isArray(textureValue)) {
        return diagnostics;
    }
    const frames = textureValue.frames;
    if (!Array.isArray(frames)) {
        return diagnostics;
    }
    for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        if (typeof frame !== 'string') {
            continue;
        }
        const id = (0, utils_1.normalizeResourceId)(frame, namespace);
        if (!textureIds.has(id)) {
            diagnostics.push((0, diagnostics_1.createCustomDiagnostic)(parsed, `Animated texture frame '${id}' does not exist in assets/${namespace}.`, (0, utils_1.workspaceWarningSeverity)(), [...pointer, 'frames', i]));
        }
    }
    return diagnostics;
}
function extractBedrockGroups(value) {
    const groups = new Set();
    const regex = /q\.bedrock(?:_[a-zA-Z]+)?\('([^']+)'\s*,\s*'[^']+'/g;
    const visit = (item) => {
        if (typeof item === 'string') {
            let match;
            while ((match = regex.exec(item)) !== null) {
                groups.add(match[1]);
            }
            return;
        }
        if (Array.isArray(item)) {
            for (const child of item) {
                visit(child);
            }
            return;
        }
        if (item && typeof item === 'object') {
            for (const child of Object.values(item)) {
                visit(child);
            }
        }
    };
    visit(value);
    return Array.from(groups);
}
//# sourceMappingURL=workspace-validation.js.map