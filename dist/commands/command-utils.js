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
exports.parseCsvIdentifiers = parseCsvIdentifiers;
exports.sanitizeFileComponent = sanitizeFileComponent;
exports.appendRelativePath = appendRelativePath;
exports.writeFileIfMissing = writeFileIfMissing;
exports.pickWorkspaceFolder = pickWorkspaceFolder;
const vscode = __importStar(require("vscode"));
function parseCsvIdentifiers(value) {
    const seen = new Set();
    for (const part of value.split(',')) {
        const key = part.trim().toLowerCase();
        if (!key) {
            continue;
        }
        if (!seen.has(key)) {
            seen.add(key);
        }
    }
    return Array.from(seen);
}
function sanitizeFileComponent(value) {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9_.-]+/g, '_').replace(/^_+|_+$/g, '');
    return sanitized.length > 0 ? sanitized : 'entry';
}
function appendRelativePath(baseUri, relativePath) {
    if (!relativePath) {
        return baseUri;
    }
    return relativePath
        .split('/')
        .filter((segment) => segment.length > 0)
        .reduce((current, segment) => vscode.Uri.joinPath(current, segment), baseUri);
}
async function writeFileIfMissing(uri, content) {
    let exists = true;
    try {
        await vscode.workspace.fs.stat(uri);
    }
    catch {
        exists = false;
    }
    if (exists) {
        const choice = await vscode.window.showQuickPick(['Overwrite', 'Keep Existing'], {
            title: `File already exists: ${uri.fsPath}`,
        });
        if (choice !== 'Overwrite') {
            return;
        }
    }
    await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
}
async function pickWorkspaceFolder() {
    const folders = vscode.workspace.workspaceFolders ?? [];
    if (folders.length === 0) {
        void vscode.window.showErrorMessage('Open a workspace folder first.');
        return undefined;
    }
    if (folders.length === 1) {
        return folders[0];
    }
    const picked = await vscode.window.showQuickPick(folders.map((folder) => ({ label: folder.name, description: folder.uri.fsPath, folder })), { title: 'Select workspace folder' });
    return picked?.folder;
}
//# sourceMappingURL=command-utils.js.map