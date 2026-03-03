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
exports.upsertSpeciesLangEntries = upsertSpeciesLangEntries;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const jsonc_parser_1 = require("jsonc-parser");
async function upsertSpeciesLangEntries(workspaceRoot, namespace, speciesId, speciesName, speciesDescription, langCode) {
    const langDir = vscode.Uri.joinPath(workspaceRoot, 'assets', namespace, 'lang');
    await vscode.workspace.fs.createDirectory(langDir);
    const langUri = vscode.Uri.joinPath(langDir, `${langCode}.json`);
    const nameKey = `${namespace}.species.${speciesId}.name`;
    const descKey = `${namespace}.species.${speciesId}.desc`;
    let exists = true;
    try {
        await vscode.workspace.fs.stat(langUri);
    }
    catch {
        exists = false;
    }
    let langObject = {};
    if (exists) {
        const raw = await vscode.workspace.fs.readFile(langUri);
        const text = Buffer.from(raw).toString('utf8');
        const parseErrors = [];
        const parsed = (0, jsonc_parser_1.parse)(text, parseErrors, {
            allowEmptyContent: false,
            allowTrailingComma: true,
            disallowComments: false,
        });
        if (parseErrors.length > 0) {
            const first = parseErrors[0];
            void vscode.window.showErrorMessage(`Could not update lang file ${path.basename(langUri.fsPath)}: ${(0, jsonc_parser_1.printParseErrorCode)(first.error)}.`);
            return undefined;
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            void vscode.window.showErrorMessage(`Could not update lang file ${path.basename(langUri.fsPath)}: expected a JSON object.`);
            return undefined;
        }
        langObject = { ...parsed };
    }
    let changed = !exists;
    const currentName = langObject[nameKey];
    if (typeof currentName !== 'string' || currentName.trim().length === 0) {
        langObject[nameKey] = speciesName;
        changed = true;
    }
    const currentDesc = langObject[descKey];
    if (typeof currentDesc !== 'string' || currentDesc.trim().length === 0) {
        langObject[descKey] = speciesDescription;
        changed = true;
    }
    if (changed) {
        await vscode.workspace.fs.writeFile(langUri, Buffer.from(JSON.stringify(langObject, null, 2) + '\n', 'utf8'));
    }
    return langUri;
}
//# sourceMappingURL=lang-utils.js.map