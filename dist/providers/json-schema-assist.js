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
exports.registerJsonSchemaAssistProviders = registerJsonSchemaAssistProviders;
const vscode = __importStar(require("vscode"));
const jsonc_parser_1 = require("jsonc-parser");
const JSON_PARSE_OPTIONS = {
    allowEmptyContent: false,
    allowTrailingComma: true,
    disallowComments: false,
};
function registerJsonSchemaAssistProviders(context, engine) {
    const selector = [
        { language: 'json', scheme: 'file' },
        { language: 'jsonc', scheme: 'file' },
    ];
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(selector, new SchemaKeyCompletionProvider(engine), '"'), vscode.languages.registerCodeActionsProvider(selector, new SchemaQuickFixProvider(engine), {
        providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
    }));
}
class SchemaKeyCompletionProvider {
    engine;
    constructor(engine) {
        this.engine = engine;
    }
    provideCompletionItems(document, position) {
        const resolution = this.engine.getSchemaForPath(document.uri.fsPath);
        if (!resolution) {
            return [];
        }
        const text = document.getText();
        const offset = document.offsetAt(position);
        const location = (0, jsonc_parser_1.getLocation)(text, offset);
        if (!location.isAtPropertyKey) {
            return [];
        }
        const objectPath = [...location.path];
        const currentKey = typeof objectPath[objectPath.length - 1] === 'string'
            ? objectPath.pop()
            : '';
        const rootNode = (0, jsonc_parser_1.parseTree)(text, [], JSON_PARSE_OPTIONS);
        if (!rootNode) {
            return [];
        }
        const objectNode = (0, jsonc_parser_1.findNodeAtLocation)(rootNode, objectPath);
        if (!objectNode || objectNode.type !== 'object') {
            return [];
        }
        const existingKeys = this.readExistingObjectKeys(objectNode);
        const suggestions = this.engine.getObjectPropertySuggestions(resolution.schemaPath, objectPath);
        if (suggestions.length === 0) {
            return [];
        }
        const keyNode = this.findPropertyKeyNodeAtOffset(rootNode, offset);
        const replacementRange = keyNode
            ? new vscode.Range(document.positionAt(keyNode.offset + 1), document.positionAt(keyNode.offset + Math.max(1, keyNode.length - 1)))
            : undefined;
        const inQuotedKey = !!keyNode;
        const items = [];
        for (const suggestion of suggestions) {
            if (existingKeys.has(suggestion.key) && suggestion.key !== currentKey) {
                continue;
            }
            const item = new vscode.CompletionItem(suggestion.key, vscode.CompletionItemKind.Property);
            item.insertText = inQuotedKey ? suggestion.key : `"${suggestion.key}"`;
            item.detail = suggestion.required ? 'required property' : 'optional property';
            item.sortText = `${suggestion.required ? '0' : '1'}-${suggestion.key}`;
            item.filterText = suggestion.key;
            if (suggestion.description) {
                item.documentation = new vscode.MarkdownString(suggestion.description);
            }
            if (suggestion.deprecated) {
                item.tags = [vscode.CompletionItemTag.Deprecated];
            }
            if (replacementRange) {
                item.range = replacementRange;
            }
            items.push(item);
        }
        return items;
    }
    readExistingObjectKeys(objectNode) {
        const keys = new Set();
        const children = objectNode.children ?? [];
        for (const propertyNode of children) {
            const keyNode = propertyNode.children?.[0];
            if (keyNode && typeof keyNode.value === 'string') {
                keys.add(keyNode.value);
            }
        }
        return keys;
    }
    findPropertyKeyNodeAtOffset(rootNode, offset) {
        if (!rootNode) {
            return undefined;
        }
        const candidate = (0, jsonc_parser_1.findNodeAtOffset)(rootNode, Math.max(0, offset - 1), true)
            ?? (0, jsonc_parser_1.findNodeAtOffset)(rootNode, offset, true);
        if (!candidate || candidate.type !== 'string' || !candidate.parent || candidate.parent.type !== 'property') {
            return undefined;
        }
        const keyNode = candidate.parent.children?.[0];
        return keyNode && keyNode === candidate ? candidate : undefined;
    }
}
class SchemaQuickFixProvider {
    engine;
    constructor(engine) {
        this.engine = engine;
    }
    provideCodeActions(document, _range, context) {
        const resolution = this.engine.getSchemaForPath(document.uri.fsPath);
        if (!resolution) {
            return [];
        }
        const text = document.getText();
        const parseErrors = [];
        const value = (0, jsonc_parser_1.parse)(text, parseErrors, JSON_PARSE_OPTIONS);
        if (parseErrors.length > 0) {
            return [];
        }
        const rootNode = (0, jsonc_parser_1.parseTree)(text, [], JSON_PARSE_OPTIONS);
        if (!rootNode) {
            return [];
        }
        const formattingOptions = readFormattingOptions(document);
        const actions = [];
        for (const diagnostic of context.diagnostics) {
            if (diagnostic.source !== 'cobblemon-schema-tools') {
                continue;
            }
            const missingMatch = diagnostic.message.match(/^Missing required property '([^']+)'\.$/);
            if (missingMatch) {
                const objectPath = resolveObjectPathFromDiagnostic(rootNode, document, diagnostic);
                if (!objectPath) {
                    continue;
                }
                const requiredAction = this.createAddMissingPropertyAction(document, diagnostic, text, resolution.schemaPath, objectPath, missingMatch[1], formattingOptions);
                if (requiredAction) {
                    actions.push(requiredAction);
                }
            }
            const unknownMatch = diagnostic.message.match(/^Unknown property '([^']+)'\.$/);
            if (unknownMatch) {
                const objectPath = resolveObjectPathFromDiagnostic(rootNode, document, diagnostic);
                if (!objectPath) {
                    continue;
                }
                const removeAction = this.createRemoveUnknownPropertyAction(document, diagnostic, text, objectPath, unknownMatch[1], formattingOptions);
                if (removeAction) {
                    actions.push(removeAction);
                }
            }
            const typeMatch = diagnostic.message.match(/^Expected type '([^']+)'\.$/);
            if (typeMatch) {
                const valuePath = resolveValuePathFromDiagnostic(rootNode, document, diagnostic);
                if (!valuePath) {
                    continue;
                }
                const convertAction = this.createTypeConversionAction(document, diagnostic, text, value, valuePath, typeMatch[1], formattingOptions);
                if (convertAction) {
                    actions.push(convertAction);
                }
            }
        }
        return actions;
    }
    createAddMissingPropertyAction(document, diagnostic, documentText, schemaPath, objectPath, propertyName, formattingOptions) {
        const value = this.engine.getPropertyPlaceholder(schemaPath, objectPath, propertyName, { shallowContainers: true });
        const edits = (0, jsonc_parser_1.modify)(documentText, [...objectPath, propertyName], value, { formattingOptions });
        if (edits.length === 0) {
            return undefined;
        }
        const action = new vscode.CodeAction(`Add missing property '${propertyName}'`, vscode.CodeActionKind.QuickFix);
        action.diagnostics = [diagnostic];
        action.edit = asWorkspaceEdit(document, edits);
        return action;
    }
    createRemoveUnknownPropertyAction(document, diagnostic, documentText, objectPath, propertyName, formattingOptions) {
        const edits = (0, jsonc_parser_1.modify)(documentText, [...objectPath, propertyName], undefined, { formattingOptions });
        if (edits.length === 0) {
            return undefined;
        }
        const action = new vscode.CodeAction(`Remove unknown property '${propertyName}'`, vscode.CodeActionKind.QuickFix);
        action.diagnostics = [diagnostic];
        action.edit = asWorkspaceEdit(document, edits);
        return action;
    }
    createTypeConversionAction(document, diagnostic, documentText, rootValue, path, expectedType, formattingOptions) {
        const current = getValueAtPath(rootValue, path);
        const converted = convertValueToExpectedType(current, expectedType);
        if (!converted.changed) {
            return undefined;
        }
        const edits = (0, jsonc_parser_1.modify)(documentText, path, converted.value, { formattingOptions });
        if (edits.length === 0) {
            return undefined;
        }
        const action = new vscode.CodeAction(`Convert value to ${expectedType}`, vscode.CodeActionKind.QuickFix);
        action.diagnostics = [diagnostic];
        action.edit = asWorkspaceEdit(document, edits);
        return action;
    }
}
function readFormattingOptions(document) {
    const editorConfig = vscode.workspace.getConfiguration('editor', document.uri);
    const rawTabSize = editorConfig.get('tabSize', 2);
    const rawInsertSpaces = editorConfig.get('insertSpaces', true);
    const tabSize = typeof rawTabSize === 'number' && Number.isFinite(rawTabSize) ? rawTabSize : 2;
    const insertSpaces = typeof rawInsertSpaces === 'boolean' ? rawInsertSpaces : true;
    const eol = document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
    return { insertSpaces, tabSize, eol };
}
function asWorkspaceEdit(document, edits) {
    const workspaceEdit = new vscode.WorkspaceEdit();
    for (const edit of edits) {
        const start = document.positionAt(edit.offset);
        const end = document.positionAt(edit.offset + edit.length);
        workspaceEdit.replace(document.uri, new vscode.Range(start, end), edit.content);
    }
    return workspaceEdit;
}
function resolveObjectPathFromDiagnostic(rootNode, document, diagnostic) {
    const node = findNodeAtDiagnosticStart(rootNode, document, diagnostic);
    if (!node) {
        return undefined;
    }
    if (node.type === 'object') {
        return (0, jsonc_parser_1.getNodePath)(node);
    }
    if (node.type === 'property') {
        return node.parent?.type === 'object' ? (0, jsonc_parser_1.getNodePath)(node.parent) : undefined;
    }
    if (node.parent?.type === 'object') {
        return (0, jsonc_parser_1.getNodePath)(node.parent);
    }
    if (node.parent?.type === 'property' && node.parent.parent?.type === 'object') {
        return (0, jsonc_parser_1.getNodePath)(node.parent.parent);
    }
    return undefined;
}
function resolveValuePathFromDiagnostic(rootNode, document, diagnostic) {
    const node = findNodeAtDiagnosticStart(rootNode, document, diagnostic);
    if (!node) {
        return undefined;
    }
    if (node.type === 'property') {
        const propertyValue = node.children?.[1];
        return propertyValue ? (0, jsonc_parser_1.getNodePath)(propertyValue) : undefined;
    }
    if (node.type === 'string' && node.parent?.type === 'property') {
        const keyNode = node.parent.children?.[0];
        if (keyNode === node) {
            const propertyValue = node.parent.children?.[1];
            return propertyValue ? (0, jsonc_parser_1.getNodePath)(propertyValue) : undefined;
        }
    }
    return (0, jsonc_parser_1.getNodePath)(node);
}
function findNodeAtDiagnosticStart(rootNode, document, diagnostic) {
    const offset = document.offsetAt(diagnostic.range.start);
    return (0, jsonc_parser_1.findNodeAtOffset)(rootNode, offset, true)
        ?? (0, jsonc_parser_1.findNodeAtOffset)(rootNode, Math.max(0, offset - 1), true);
}
function getValueAtPath(root, path) {
    let current = root;
    for (const segment of path) {
        if (typeof segment === 'number') {
            if (!Array.isArray(current) || segment < 0 || segment >= current.length) {
                return undefined;
            }
            current = current[segment];
            continue;
        }
        if (!current || typeof current !== 'object' || Array.isArray(current)) {
            return undefined;
        }
        const record = current;
        if (!(segment in record)) {
            return undefined;
        }
        current = record[segment];
    }
    return current;
}
function convertValueToExpectedType(value, expectedType) {
    if (expectedType === 'number' || expectedType === 'integer') {
        if (typeof value !== 'string') {
            return { changed: false, value };
        }
        const trimmed = value.trim();
        if (!/^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+\-]?\d+)?$/.test(trimmed)) {
            return { changed: false, value };
        }
        const parsed = Number(trimmed);
        if (!Number.isFinite(parsed)) {
            return { changed: false, value };
        }
        if (expectedType === 'integer' && !Number.isInteger(parsed)) {
            return { changed: false, value };
        }
        return { changed: true, value: parsed };
    }
    if (expectedType === 'boolean') {
        if (typeof value !== 'string') {
            return { changed: false, value };
        }
        const lowered = value.trim().toLowerCase();
        if (lowered === 'true') {
            return { changed: true, value: true };
        }
        if (lowered === 'false') {
            return { changed: true, value: false };
        }
        return { changed: false, value };
    }
    return { changed: false, value };
}
//# sourceMappingURL=json-schema-assist.js.map