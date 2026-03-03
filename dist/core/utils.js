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
exports.DATA_ROOT_EXCLUDE = void 0;
exports.inferNamespaceFromPath = inferNamespaceFromPath;
exports.normalizeResourceId = normalizeResourceId;
exports.normalizeSlug = normalizeSlug;
exports.normalizePath = normalizePath;
exports.getStringProperty = getStringProperty;
exports.toAssetResourceId = toAssetResourceId;
exports.toModelResourceId = toModelResourceId;
exports.toAnimationGroupName = toAnimationGroupName;
exports.strictNamingSeverity = strictNamingSeverity;
exports.workspaceWarningSeverity = workspaceWarningSeverity;
exports.isValidationEnabled = isValidationEnabled;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
exports.DATA_ROOT_EXCLUDE = '**/{.git,node_modules,.gradle,build,out,target,.idea}/**';
function inferNamespaceFromPath(pathNorm, marker) {
    const index = pathNorm.indexOf(marker);
    if (index === -1) {
        return undefined;
    }
    const after = pathNorm.slice(index + marker.length);
    const namespace = after.split('/', 1)[0];
    return namespace || undefined;
}
function normalizeResourceId(raw, namespace) {
    const trimmed = raw.trim().toLowerCase();
    if (trimmed.includes(':')) {
        return trimmed;
    }
    return `${namespace}:${trimmed}`;
}
function normalizeSlug(value) {
    return value.replace(/[^a-z0-9]/g, '').toLowerCase();
}
function normalizePath(value) {
    return value.replace(/\\/g, '/');
}
function getStringProperty(obj, key) {
    const value = obj[key];
    return typeof value === 'string' ? value : undefined;
}
function toAssetResourceId(filePath) {
    const normalized = normalizePath(filePath);
    const match = normalized.match(/\/assets\/([^/]+)\/(.+)$/);
    if (!match) {
        return undefined;
    }
    return `${match[1]}:${match[2]}`.toLowerCase();
}
function toModelResourceId(filePath) {
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
function toAnimationGroupName(filePath) {
    const normalized = normalizePath(filePath);
    if (!normalized.endsWith('.animation.json')) {
        return undefined;
    }
    if (!/\/assets\/[^/]+\/bedrock\//.test(normalized)) {
        return undefined;
    }
    return path.basename(normalized).replace(/\.animation\.json$/, '').toLowerCase();
}
function strictNamingSeverity() {
    const strict = vscode.workspace.getConfiguration('cobblemonSchemaTools').get('strictAssetNaming', false);
    return strict || isStrictWorkspaceValidationEnabled()
        ? vscode.DiagnosticSeverity.Error
        : vscode.DiagnosticSeverity.Warning;
}
function workspaceWarningSeverity() {
    return isStrictWorkspaceValidationEnabled()
        ? vscode.DiagnosticSeverity.Error
        : vscode.DiagnosticSeverity.Warning;
}
function isValidationEnabled() {
    return vscode.workspace.getConfiguration('cobblemonSchemaTools').get('enableWorkspaceValidation', true);
}
function isStrictWorkspaceValidationEnabled() {
    return vscode.workspace.getConfiguration('cobblemonSchemaTools').get('strictWorkspaceValidation', true);
}
//# sourceMappingURL=utils.js.map