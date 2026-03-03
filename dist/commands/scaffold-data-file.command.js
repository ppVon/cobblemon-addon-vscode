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
exports.scaffoldDataFileCommand = void 0;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const command_utils_1 = require("./command-utils");
exports.scaffoldDataFileCommand = {
    id: 'cobblemonSchemaTools.scaffoldDataFile',
    run: async ({ engine, scheduleValidation }) => {
        await scaffoldDataFile(engine);
        scheduleValidation();
    },
};
async function scaffoldDataFile(engine) {
    const folder = await (0, command_utils_1.pickWorkspaceFolder)();
    if (!folder) {
        return;
    }
    const schemaOptions = engine.getDataSchemaOptions();
    const selected = await vscode.window.showQuickPick(schemaOptions.map((entry) => ({ label: entry.label, detail: entry.schemaPath, entry })), { title: 'Select Cobblemon schema type for new data file' });
    if (!selected) {
        return;
    }
    const namespace = (await vscode.window.showInputBox({
        title: 'Data Namespace',
        prompt: 'Namespace under data/<namespace>/...',
        value: 'cobblemon',
        validateInput: (value) => (/^[a-z0-9_.-]+$/.test(value) ? undefined : 'Use lowercase namespace characters.'),
    }))?.trim();
    if (!namespace) {
        return;
    }
    const schemaPath = selected.entry.schemaPath;
    const targetUri = await resolveTargetDataFileUri(folder.uri, schemaPath, namespace);
    if (!targetUri) {
        return;
    }
    const defaultId = path.basename(targetUri.fsPath, '.json');
    const content = engine.createTemplateForSchema(schemaPath, defaultId);
    await (0, command_utils_1.writeFileIfMissing)(targetUri, content);
    const doc = await vscode.workspace.openTextDocument(targetUri);
    await vscode.window.showTextDocument(doc);
}
async function resolveTargetDataFileUri(workspaceRoot, schemaPath, namespace) {
    const mechanics = schemaPath.match(/^schemas\/mechanics\/([^.]+)\.schema\.json$/);
    if (mechanics) {
        const dir = vscode.Uri.joinPath(workspaceRoot, 'data', namespace, 'mechanics');
        await vscode.workspace.fs.createDirectory(dir);
        return vscode.Uri.joinPath(dir, `${mechanics[1]}.json`);
    }
    const ride = schemaPath.match(/^schemas\/ride_settings\/([^.]+)\.schema\.json$/);
    if (ride) {
        const dir = vscode.Uri.joinPath(workspaceRoot, 'data', namespace, 'ride_settings');
        await vscode.workspace.fs.createDirectory(dir);
        return vscode.Uri.joinPath(dir, `${ride[1]}.json`);
    }
    const folder = schemaPath.match(/^schemas\/([^/]+)\/schema\.json$/)?.[1];
    if (!folder || folder === '_shared') {
        return undefined;
    }
    const id = (await vscode.window.showInputBox({
        title: 'File id',
        prompt: `File id for data/${namespace}/${folder}/...`,
        value: 'new_entry',
        validateInput: (value) => (value.trim().length > 0 ? undefined : 'Provide a file id.'),
    }))?.trim();
    if (!id) {
        return undefined;
    }
    const dir = vscode.Uri.joinPath(workspaceRoot, 'data', namespace, folder);
    await vscode.workspace.fs.createDirectory(dir);
    return vscode.Uri.joinPath(dir, `${id}.json`);
}
//# sourceMappingURL=scaffold-data-file.command.js.map