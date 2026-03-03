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
exports.generateSpawnPoolWorldCommand = void 0;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const command_utils_1 = require("./command-utils");
const species_utils_1 = require("./species-utils");
exports.generateSpawnPoolWorldCommand = {
    id: 'cobblemonSchemaTools.generateSpawnPoolWorld',
    run: async ({ scheduleValidation }) => {
        await generateSpawnPoolWorldFromSpecies();
        scheduleValidation();
    },
};
async function generateSpawnPoolWorldFromSpecies() {
    const folder = await (0, command_utils_1.pickWorkspaceFolder)();
    if (!folder) {
        return;
    }
    const speciesRecords = await (0, species_utils_1.collectWorkspaceSpecies)(folder.uri);
    if (speciesRecords.length === 0) {
        void vscode.window.showWarningMessage('No species files were found under data/*/species/**/*.json.');
        return;
    }
    const selected = await vscode.window.showQuickPick(speciesRecords.map((record) => ({
        label: record.id,
        description: record.dexNumber ? `#${record.dexNumber} ${record.displayName}` : record.displayName,
        detail: path.relative(folder.uri.fsPath, record.uri.fsPath),
        record,
    })), {
        title: 'Select species for spawn_pool_world generation',
        placeHolder: 'Search by species id, name, or file path',
        matchOnDescription: true,
        matchOnDetail: true,
    });
    if (!selected) {
        return;
    }
    const targetDir = vscode.Uri.joinPath(folder.uri, 'data', selected.record.namespace, 'spawn_pool_world');
    await vscode.workspace.fs.createDirectory(targetDir);
    const fileBase = selected.record.dexNumber
        ? `${String(selected.record.dexNumber).padStart(4, '0')}_${selected.record.slug}`
        : selected.record.slug;
    const targetUri = vscode.Uri.joinPath(targetDir, `${fileBase}.json`);
    const content = JSON.stringify((0, species_utils_1.buildSpawnPoolWorldTemplate)(selected.record), null, 2) + '\n';
    await (0, command_utils_1.writeFileIfMissing)(targetUri, content);
    const doc = await vscode.workspace.openTextDocument(targetUri);
    await vscode.window.showTextDocument(doc);
}
//# sourceMappingURL=generate-spawn-pool-world.command.js.map