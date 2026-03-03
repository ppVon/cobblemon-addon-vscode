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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const commands_1 = require("./commands");
const utils_1 = require("./core/utils");
const json_schema_assist_1 = require("./providers/json-schema-assist");
const schema_engine_1 = require("./schema/schema-engine");
const workspace_validation_1 = require("./validation/workspace-validation");
async function activate(context) {
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('cobblemon-schema-tools');
    context.subscriptions.push(diagnosticCollection);
    const engine = new schema_engine_1.CobblemonSchemaEngine();
    await engine.initialize(context);
    (0, json_schema_assist_1.registerJsonSchemaAssistProviders)(context, engine);
    let timeoutHandle;
    const scheduleValidation = () => {
        if (!(0, utils_1.isValidationEnabled)()) {
            diagnosticCollection.clear();
            return;
        }
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
        }
        timeoutHandle = setTimeout(() => {
            void (0, workspace_validation_1.runWorkspaceValidation)(engine, diagnosticCollection);
        }, 350);
    };
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(() => scheduleValidation()), vscode.workspace.onDidOpenTextDocument(() => scheduleValidation()), vscode.workspace.onDidCreateFiles(() => scheduleValidation()), vscode.workspace.onDidDeleteFiles(() => scheduleValidation()), vscode.workspace.onDidRenameFiles(() => scheduleValidation()), vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('cobblemonSchemaTools')) {
            scheduleValidation();
        }
    }));
    (0, commands_1.registerCommands)(context, {
        engine,
        diagnostics: diagnosticCollection,
        scheduleValidation,
    });
    scheduleValidation();
}
function deactivate() {
    // Nothing to clean up explicitly.
}
//# sourceMappingURL=extension.js.map