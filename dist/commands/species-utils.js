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
exports.collectWorkspaceSpecies = collectWorkspaceSpecies;
exports.buildSpawnPoolWorldTemplate = buildSpawnPoolWorldTemplate;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const json_1 = require("../core/json");
const utils_1 = require("../core/utils");
const command_utils_1 = require("./command-utils");
async function collectWorkspaceSpecies(workspaceRoot) {
    const files = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceRoot, 'data/*/species/**/*.json'), utils_1.DATA_ROOT_EXCLUDE);
    const records = [];
    const identifierPattern = /^(?:[a-z0-9_.-]+:)?[a-z0-9_./-]+$/i;
    for (const uri of files) {
        const parsed = await (0, json_1.parseWorkspaceJson)(uri);
        if (parsed.parseErrors.length > 0 || !parsed.value || typeof parsed.value !== 'object' || Array.isArray(parsed.value)) {
            continue;
        }
        const obj = parsed.value;
        const normalizedPath = (0, utils_1.normalizePath)(uri.fsPath);
        const namespace = (0, utils_1.inferNamespaceFromPath)(normalizedPath, '/data/') ?? 'minecraft';
        const fileStem = path.basename(uri.fsPath, '.json');
        const fileSlug = (0, command_utils_1.sanitizeFileComponent)(fileStem);
        const rawName = (0, utils_1.getStringProperty)(obj, 'name')?.trim() ?? '';
        const speciesId = rawName.length > 0 && identifierPattern.test(rawName)
            ? (0, utils_1.normalizeResourceId)(rawName, namespace)
            : (0, utils_1.normalizeResourceId)(fileSlug, namespace);
        const speciesPath = speciesId.split(':', 2)[1] ?? speciesId;
        const displayName = rawName.length > 0 ? rawName : fileStem;
        const dexRaw = obj.nationalPokedexNumber;
        const dexNumber = typeof dexRaw === 'number' && Number.isFinite(dexRaw) ? Math.trunc(dexRaw) : undefined;
        records.push({
            id: speciesId,
            namespace,
            slug: (0, command_utils_1.sanitizeFileComponent)(speciesPath.replace(/\//g, '_')),
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
function buildSpawnPoolWorldTemplate(species) {
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
//# sourceMappingURL=species-utils.js.map