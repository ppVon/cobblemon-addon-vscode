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
exports.showPokemonBuilderForm = showPokemonBuilderForm;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const vscode = __importStar(require("vscode"));
const types_1 = require("./types");
const form_validation_1 = require("./form-validation");
const FORM_TEMPLATE_PATH = path.join(__dirname, 'pokemon-builder.form.html');
async function showPokemonBuilderForm(initial) {
    const panel = vscode.window.createWebviewPanel('cobblemonPokemonBuilder', 'Cobblemon Pokemon Builder', vscode.ViewColumn.One, {
        enableScripts: true,
        retainContextWhenHidden: false,
    });
    const nonce = createNonce();
    panel.webview.html = renderPokemonBuilderWebviewHtml(panel.webview, initial, nonce);
    return await new Promise((resolve) => {
        const disposables = [];
        let settled = false;
        const finish = (value) => {
            if (settled) {
                return;
            }
            settled = true;
            for (const disposable of disposables) {
                disposable.dispose();
            }
            resolve(value);
        };
        disposables.push(panel.onDidDispose(() => {
            finish(undefined);
        }));
        disposables.push(panel.webview.onDidReceiveMessage((rawMessage) => {
            if (!rawMessage || typeof rawMessage !== 'object') {
                return;
            }
            const message = rawMessage;
            if (message.type === 'cancel') {
                finish(undefined);
                panel.dispose();
                return;
            }
            if (message.type !== 'submit' || !(0, form_validation_1.isPokemonBuilderFormData)(message.data)) {
                return;
            }
            const error = (0, form_validation_1.validatePokemonBuilderFormData)(message.data);
            if (error) {
                void panel.webview.postMessage({ type: 'error', message: error });
                return;
            }
            finish(message.data);
            panel.dispose();
        }));
    });
}
function renderPokemonBuilderWebviewHtml(webview, initial, nonce) {
    const template = fs.readFileSync(FORM_TEMPLATE_PATH, 'utf8');
    const initialJson = JSON.stringify(initial).replace(/</g, '\\u003c');
    const typeOptions = types_1.COBBLEMON_TYPES.map((type) => `<option value="${type}">${type}</option>`).join('');
    const secondaryTypeOptions = `<option value="">(none)</option>${typeOptions}`;
    return template
        .replaceAll('__CSP_SOURCE__', webview.cspSource)
        .replaceAll('__NONCE__', nonce)
        .replaceAll('__BUILDER_NAMESPACE__', types_1.POKEMON_BUILDER_NAMESPACE)
        .replaceAll('__TYPE_OPTIONS__', typeOptions)
        .replaceAll('__SECONDARY_TYPE_OPTIONS__', secondaryTypeOptions)
        .replaceAll('__INITIAL_JSON__', initialJson)
        .replaceAll('__COBBLEMON_TYPES_JSON__', JSON.stringify(types_1.COBBLEMON_TYPES));
}
function createNonce() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 24; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
//# sourceMappingURL=webview.js.map