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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CobblemonSchemaEngine = void 0;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const _2020_1 = __importDefault(require("ajv/dist/2020"));
const utils_1 = require("../core/utils");
const diagnostics_1 = require("../core/diagnostics");
class CobblemonSchemaEngine {
    ajv = new _2020_1.default({ allErrors: true, strict: false, allowUnionTypes: true, verbose: true });
    schemaByPath = new Map();
    schemaPathById = new Map();
    validators = new Map();
    schemaNameByPath = new Map();
    folderSchemas = new Map();
    fixedDataSchemas = new Map();
    async initialize(context) {
        const schemaRoot = vscode.Uri.joinPath(context.extensionUri, 'schemas');
        const indexUri = vscode.Uri.joinPath(schemaRoot, 'index.json');
        const rawIndex = await vscode.workspace.fs.readFile(indexUri);
        const index = JSON.parse(Buffer.from(rawIndex).toString('utf8'));
        await this.loadSchemasRecursive(schemaRoot, 'schemas');
        for (const entry of index.schemas) {
            if (entry.path.startsWith('schemas/_shared/')) {
                continue;
            }
            this.schemaNameByPath.set(entry.path, entry.name);
            this.indexSchemaMatcher(entry.path);
            const validate = this.resolveValidator(entry);
            if (validate) {
                this.validators.set(entry.path, validate);
            }
        }
    }
    getSchemaForPath(filePath) {
        const normalized = (0, utils_1.normalizePath)(filePath);
        if (/\/assets\/[^/]+\/bedrock\/pokemon\/resolvers\//.test(normalized)) {
            const schemaPath = 'schemas/bedrock_pokemon_resolvers/schema.json';
            return this.wrapResolution(schemaPath);
        }
        if (/\/assets\/[^/]+\/bedrock\/(pokemon|npcs|fossils|block_entities|generic|poke_balls)\/posers\//.test(normalized)) {
            const schemaPath = 'schemas/bedrock_posers/schema.json';
            return this.wrapResolution(schemaPath);
        }
        const dataMatch = normalized.match(/\/data\/[^/]+\/([^/]+)\/(.+\.json)$/);
        if (!dataMatch) {
            return undefined;
        }
        const folder = dataMatch[1];
        const tail = dataMatch[2];
        const fileName = path.basename(tail);
        const fixed = this.fixedDataSchemas.get(folder)?.get(fileName);
        if (fixed) {
            return this.wrapResolution(fixed);
        }
        const folderSchema = this.folderSchemas.get(folder);
        if (folderSchema) {
            return this.wrapResolution(folderSchema);
        }
        return undefined;
    }
    validateJsonFile(parsed, schemaPath) {
        const diagnostics = [];
        if (parsed.parseErrors.length > 0) {
            diagnostics.push(...(0, diagnostics_1.createParseDiagnostics)(parsed));
            return diagnostics;
        }
        const validator = this.validators.get(schemaPath);
        if (!validator) {
            return diagnostics;
        }
        const ok = validator(parsed.value);
        if (ok) {
            return diagnostics;
        }
        const errors = (0, diagnostics_1.simplifyAjvErrors)(validator.errors ?? [], parsed.value);
        for (const err of errors) {
            diagnostics.push((0, diagnostics_1.createAjvDiagnostic)(parsed, err));
        }
        return diagnostics;
    }
    getDataSchemaOptions() {
        const out = [];
        for (const [schemaPath, name] of this.schemaNameByPath.entries()) {
            if (schemaPath.includes('/_shared/')) {
                continue;
            }
            if (schemaPath.includes('/bedrock_')) {
                continue;
            }
            out.push({ label: name, schemaPath });
        }
        return out.sort((a, b) => a.label.localeCompare(b.label));
    }
    createTemplateForSchema(schemaPath, hintId) {
        void hintId;
        const schema = this.schemaByPath.get(schemaPath);
        const template = this.buildTemplateForSchemaNode(schema, schemaPath, new Set());
        const value = template === undefined ? {} : template;
        return JSON.stringify(value, null, 2) + '\n';
    }
    getObjectPropertySuggestions(schemaPath, objectPath) {
        const rootSchema = this.schemaByPath.get(schemaPath);
        if (!this.isRecord(rootSchema)) {
            return [];
        }
        const candidates = this.getSchemaCandidatesAtPath(rootSchema, schemaPath, objectPath);
        const propertyMap = new Map();
        for (const candidate of candidates) {
            this.collectObjectPropertyCandidates(candidate.schema, candidate.schemaPath, new Set(), propertyMap, 0);
        }
        const output = [];
        for (const [key, details] of propertyMap.entries()) {
            const placeholder = details.schema
                ? (this.buildTemplateForSchemaNode(details.schema, details.schemaPath, new Set()) ?? '')
                : '';
            output.push({
                key,
                required: details.required,
                description: details.description,
                deprecated: details.deprecated,
                placeholder,
            });
        }
        return output.sort((a, b) => {
            if (a.required !== b.required) {
                return a.required ? -1 : 1;
            }
            return a.key.localeCompare(b.key);
        });
    }
    getPropertyPlaceholder(schemaPath, objectPath, propertyName, options) {
        const suggestions = this.getObjectPropertySuggestions(schemaPath, objectPath);
        const match = suggestions.find((item) => item.key === propertyName);
        if (!match) {
            return '';
        }
        if (options?.shallowContainers === true) {
            if (Array.isArray(match.placeholder)) {
                return [];
            }
            if (this.isRecord(match.placeholder)) {
                return {};
            }
        }
        return match.placeholder;
    }
    wrapResolution(schemaPath) {
        if (!this.validators.has(schemaPath)) {
            return undefined;
        }
        const schemaName = this.schemaNameByPath.get(schemaPath) ?? schemaPath;
        return { schemaPath, schemaName };
    }
    resolveValidator(entry) {
        if (entry.$id) {
            const byId = this.ajv.getSchema(entry.$id);
            if (byId) {
                return byId;
            }
        }
        const schemaObj = this.schemaByPath.get(entry.path);
        if (!schemaObj) {
            return undefined;
        }
        return this.ajv.compile(schemaObj);
    }
    indexSchemaMatcher(schemaPath) {
        const mechanicsMatch = schemaPath.match(/^schemas\/mechanics\/([^.]+)\.schema\.json$/);
        if (mechanicsMatch) {
            this.addFixedSchema('mechanics', `${mechanicsMatch[1]}.json`, schemaPath);
            return;
        }
        const rideMatch = schemaPath.match(/^schemas\/ride_settings\/([^.]+)\.schema\.json$/);
        if (rideMatch) {
            this.addFixedSchema('ride_settings', `${rideMatch[1]}.json`, schemaPath);
            return;
        }
        const folderMatch = schemaPath.match(/^schemas\/([^/]+)\/schema\.json$/);
        if (!folderMatch) {
            return;
        }
        const folder = folderMatch[1];
        if (folder === '_shared' || folder.startsWith('bedrock_')) {
            return;
        }
        this.folderSchemas.set(folder, schemaPath);
    }
    addFixedSchema(folder, fileName, schemaPath) {
        let folderMap = this.fixedDataSchemas.get(folder);
        if (!folderMap) {
            folderMap = new Map();
            this.fixedDataSchemas.set(folder, folderMap);
        }
        folderMap.set(fileName, schemaPath);
    }
    async loadSchemasRecursive(uri, relativeRoot) {
        const entries = await vscode.workspace.fs.readDirectory(uri);
        for (const [name, type] of entries) {
            const child = vscode.Uri.joinPath(uri, name);
            const rel = `${relativeRoot}/${name}`;
            if (type === vscode.FileType.Directory) {
                await this.loadSchemasRecursive(child, rel);
                continue;
            }
            if (type !== vscode.FileType.File || !name.endsWith('.json')) {
                continue;
            }
            const raw = await vscode.workspace.fs.readFile(child);
            const text = Buffer.from(raw).toString('utf8');
            const schema = JSON.parse(text);
            this.schemaByPath.set(rel, schema);
            if (typeof schema.$id === 'string') {
                this.schemaPathById.set(schema.$id, rel);
            }
            const schemaId = typeof schema.$id === 'string' ? schema.$id : rel;
            this.ajv.addSchema(schema, schemaId);
        }
    }
    buildTemplateForSchemaNode(rawSchema, schemaPath, refStack) {
        const dereferenced = this.dereferenceSchema(rawSchema, schemaPath, refStack);
        if (!dereferenced) {
            return undefined;
        }
        const { schema, schemaPath: resolvedPath } = dereferenced;
        const allOf = this.readSchemaArray(schema.allOf);
        if (allOf.length > 0) {
            const merged = {};
            const base = this.buildTemplateWithoutCombinators(schema, resolvedPath, refStack);
            if (this.isRecord(base)) {
                this.mergeTemplateObjectInto(merged, base);
            }
            for (const part of allOf) {
                const partTemplate = this.buildTemplateForSchemaNode(part, resolvedPath, new Set(refStack));
                if (this.isRecord(partTemplate)) {
                    this.mergeTemplateObjectInto(merged, partTemplate);
                }
            }
            if (Object.keys(merged).length > 0) {
                return merged;
            }
            return base;
        }
        const oneOf = this.readSchemaArray(schema.oneOf);
        if (oneOf.length > 0) {
            return this.buildTemplateFromBranch(schema, resolvedPath, oneOf, refStack);
        }
        const anyOf = this.readSchemaArray(schema.anyOf);
        if (anyOf.length > 0) {
            return this.buildTemplateFromBranch(schema, resolvedPath, anyOf, refStack);
        }
        return this.buildTemplateWithoutCombinators(schema, resolvedPath, refStack);
    }
    buildTemplateFromBranch(schema, schemaPath, branches, refStack) {
        const base = this.buildTemplateWithoutCombinators(schema, schemaPath, refStack);
        let selectedBranch = undefined;
        for (const branch of branches) {
            const branchTemplate = this.buildTemplateForSchemaNode(branch, schemaPath, new Set(refStack));
            if (branchTemplate !== undefined) {
                selectedBranch = branchTemplate;
                break;
            }
        }
        if (this.isRecord(base) && this.isRecord(selectedBranch)) {
            const merged = {};
            this.mergeTemplateObjectInto(merged, base);
            this.mergeTemplateObjectInto(merged, selectedBranch);
            return merged;
        }
        return selectedBranch === undefined ? base : selectedBranch;
    }
    buildTemplateWithoutCombinators(schema, schemaPath, refStack) {
        if (this.isArraySchema(schema)) {
            return this.buildArrayTemplate(schema, schemaPath, refStack);
        }
        if (this.isObjectSchema(schema)) {
            const required = this.readStringArray(schema.required);
            const properties = this.isRecord(schema.properties) ? schema.properties : undefined;
            const result = {};
            for (const key of required) {
                const propertySchema = properties ? properties[key] : undefined;
                result[key] = propertySchema === undefined
                    ? ''
                    : (this.buildTemplateForSchemaNode(propertySchema, schemaPath, new Set(refStack)) ?? '');
            }
            return result;
        }
        return this.primitivePlaceholderForSchema(schema, schemaPath, refStack);
    }
    primitivePlaceholderForSchema(schema, schemaPath, refStack) {
        const declaredType = this.readPrimaryType(schema.type);
        if (declaredType === 'string') {
            return '';
        }
        if (declaredType === 'number' || declaredType === 'integer') {
            return 0;
        }
        if (declaredType === 'boolean') {
            return false;
        }
        if (declaredType === 'array') {
            return this.buildArrayTemplate(schema, schemaPath, refStack);
        }
        if (declaredType === 'object') {
            return {};
        }
        if (declaredType === 'null') {
            return null;
        }
        const constValue = schema.const;
        if (typeof constValue === 'number') {
            return 0;
        }
        if (typeof constValue === 'boolean') {
            return false;
        }
        if (constValue === null) {
            return null;
        }
        if (typeof constValue === 'string') {
            return '';
        }
        if (this.isArraySchema(schema)) {
            return this.buildArrayTemplate(schema, schemaPath, refStack);
        }
        if (this.isObjectSchema(schema)) {
            return {};
        }
        return '';
    }
    buildArrayTemplate(schema, schemaPath, refStack) {
        void schema;
        void schemaPath;
        void refStack;
        return [];
    }
    dereferenceSchema(rawSchema, currentSchemaPath, refStack) {
        if (!this.isRecord(rawSchema)) {
            return undefined;
        }
        const refValue = rawSchema.$ref;
        if (typeof refValue !== 'string') {
            return { schema: rawSchema, schemaPath: currentSchemaPath };
        }
        const resolved = this.resolveRef(refValue, currentSchemaPath);
        if (!resolved || !this.isRecord(resolved.schema)) {
            return { schema: rawSchema, schemaPath: currentSchemaPath };
        }
        const refKey = `${resolved.schemaPath}#${resolved.pointer}`;
        if (refStack.has(refKey)) {
            return { schema: resolved.schema, schemaPath: resolved.schemaPath };
        }
        const nextStack = new Set(refStack);
        nextStack.add(refKey);
        const dereferenced = this.dereferenceSchema(resolved.schema, resolved.schemaPath, nextStack);
        if (!dereferenced) {
            return { schema: rawSchema, schemaPath: currentSchemaPath };
        }
        const siblingEntries = Object.entries(rawSchema).filter(([key]) => key !== '$ref');
        if (siblingEntries.length === 0) {
            return dereferenced;
        }
        return {
            schema: {
                ...dereferenced.schema,
                ...Object.fromEntries(siblingEntries),
            },
            schemaPath: dereferenced.schemaPath,
        };
    }
    resolveRef(refValue, currentSchemaPath) {
        const hashIndex = refValue.indexOf('#');
        const refPath = hashIndex >= 0 ? refValue.slice(0, hashIndex) : refValue;
        const pointer = hashIndex >= 0 ? refValue.slice(hashIndex + 1) : '';
        let targetSchemaPath = currentSchemaPath;
        if (refPath.length > 0) {
            if (refPath.startsWith('http://') || refPath.startsWith('https://')) {
                const byId = this.schemaPathById.get(refPath);
                if (!byId) {
                    return undefined;
                }
                targetSchemaPath = byId;
            }
            else {
                targetSchemaPath = path.posix.normalize(path.posix.join(path.posix.dirname(currentSchemaPath), refPath));
            }
        }
        const targetSchema = this.schemaByPath.get(targetSchemaPath);
        if (targetSchema === undefined) {
            return undefined;
        }
        const targetNode = pointer.length > 0
            ? this.readJsonPointer(targetSchema, pointer)
            : targetSchema;
        return {
            schemaPath: targetSchemaPath,
            schema: targetNode,
            pointer,
        };
    }
    readJsonPointer(root, pointer) {
        const normalized = pointer.startsWith('/') ? pointer.slice(1) : pointer;
        if (normalized.length === 0) {
            return root;
        }
        let current = root;
        for (const part of normalized.split('/')) {
            const segment = part.replace(/~1/g, '/').replace(/~0/g, '~');
            if (Array.isArray(current)) {
                const index = Number.parseInt(segment, 10);
                if (!Number.isInteger(index) || index < 0 || index >= current.length) {
                    return undefined;
                }
                current = current[index];
                continue;
            }
            if (!this.isRecord(current) || !(segment in current)) {
                return undefined;
            }
            current = current[segment];
        }
        return current;
    }
    mergeTemplateObjectInto(target, source) {
        for (const [key, value] of Object.entries(source)) {
            const existing = target[key];
            if (this.isRecord(existing) && this.isRecord(value)) {
                this.mergeTemplateObjectInto(existing, value);
                continue;
            }
            target[key] = value;
        }
    }
    readPrimaryType(rawType) {
        if (typeof rawType === 'string') {
            return rawType;
        }
        if (Array.isArray(rawType)) {
            for (const candidate of rawType) {
                if (typeof candidate === 'string' && candidate !== 'null') {
                    return candidate;
                }
            }
            const first = rawType[0];
            return typeof first === 'string' ? first : undefined;
        }
        return undefined;
    }
    isArraySchema(schema) {
        return this.readPrimaryType(schema.type) === 'array' || schema.items !== undefined;
    }
    isObjectSchema(schema) {
        return this.readPrimaryType(schema.type) === 'object' || schema.properties !== undefined || schema.required !== undefined;
    }
    readSchemaArray(value) {
        if (!Array.isArray(value)) {
            return [];
        }
        return value.filter((item) => this.isRecord(item));
    }
    readStringArray(value) {
        if (!Array.isArray(value)) {
            return [];
        }
        return value.filter((item) => typeof item === 'string');
    }
    isRecord(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }
    getSchemaCandidatesAtPath(rootSchema, rootSchemaPath, pathSegments) {
        let current = [{ schema: rootSchema, schemaPath: rootSchemaPath }];
        for (const segment of pathSegments) {
            const next = [];
            for (const candidate of current) {
                const segmentMatches = typeof segment === 'number'
                    ? this.collectArrayChildCandidates(candidate.schema, candidate.schemaPath, segment, new Set(), 0)
                    : this.collectPropertyChildCandidates(candidate.schema, candidate.schemaPath, segment, new Set(), 0);
                this.pushUniqueSchemaCandidates(next, segmentMatches);
            }
            if (next.length === 0) {
                return [];
            }
            current = next;
        }
        return current;
    }
    collectPropertyChildCandidates(rawSchema, schemaPath, propertyName, refStack, depth) {
        if (depth > 24) {
            return [];
        }
        const dereferenced = this.dereferenceSchema(rawSchema, schemaPath, refStack);
        if (!dereferenced) {
            return [];
        }
        const { schema, schemaPath: resolvedPath } = dereferenced;
        const out = [];
        const properties = this.isRecord(schema.properties) ? schema.properties : undefined;
        const direct = properties ? properties[propertyName] : undefined;
        if (this.isRecord(direct)) {
            this.pushCandidateFromRaw(out, direct, resolvedPath, new Set(refStack));
        }
        if (direct === undefined && this.isRecord(schema.additionalProperties)) {
            this.pushCandidateFromRaw(out, schema.additionalProperties, resolvedPath, new Set(refStack));
        }
        this.collectFromCombinatorBranches(out, schema, resolvedPath, refStack, depth, (branch, nextPath, nextStack, nextDepth) => this.collectPropertyChildCandidates(branch, nextPath, propertyName, nextStack, nextDepth));
        return out;
    }
    collectArrayChildCandidates(rawSchema, schemaPath, index, refStack, depth) {
        if (depth > 24) {
            return [];
        }
        const dereferenced = this.dereferenceSchema(rawSchema, schemaPath, refStack);
        if (!dereferenced) {
            return [];
        }
        const { schema, schemaPath: resolvedPath } = dereferenced;
        const out = [];
        const prefixItems = this.readSchemaArray(schema.prefixItems);
        if (index < prefixItems.length) {
            this.pushCandidateFromRaw(out, prefixItems[index], resolvedPath, new Set(refStack));
        }
        else if (this.isRecord(schema.items)) {
            this.pushCandidateFromRaw(out, schema.items, resolvedPath, new Set(refStack));
        }
        else if (Array.isArray(schema.items) && index < schema.items.length && this.isRecord(schema.items[index])) {
            this.pushCandidateFromRaw(out, schema.items[index], resolvedPath, new Set(refStack));
        }
        this.collectFromCombinatorBranches(out, schema, resolvedPath, refStack, depth, (branch, nextPath, nextStack, nextDepth) => this.collectArrayChildCandidates(branch, nextPath, index, nextStack, nextDepth));
        return out;
    }
    collectObjectPropertyCandidates(rawSchema, schemaPath, refStack, out, depth) {
        if (depth > 24) {
            return;
        }
        const dereferenced = this.dereferenceSchema(rawSchema, schemaPath, refStack);
        if (!dereferenced) {
            return;
        }
        const { schema, schemaPath: resolvedPath } = dereferenced;
        const required = new Set(this.readStringArray(schema.required));
        const properties = this.isRecord(schema.properties) ? schema.properties : undefined;
        for (const key of required) {
            const existing = out.get(key);
            if (!existing) {
                out.set(key, {
                    required: true,
                    schemaPath: resolvedPath,
                    deprecated: false,
                });
            }
            else {
                existing.required = true;
            }
        }
        if (properties) {
            for (const [key, value] of Object.entries(properties)) {
                const valueSchema = this.isRecord(value) ? value : undefined;
                const existing = out.get(key);
                if (!existing) {
                    out.set(key, {
                        required: required.has(key),
                        schema: valueSchema,
                        schemaPath: resolvedPath,
                        description: valueSchema && typeof valueSchema.description === 'string' ? valueSchema.description : undefined,
                        deprecated: valueSchema?.deprecated === true,
                    });
                    continue;
                }
                existing.required = existing.required || required.has(key);
                if (!existing.schema && valueSchema) {
                    existing.schema = valueSchema;
                    existing.schemaPath = resolvedPath;
                }
                if (!existing.description && valueSchema && typeof valueSchema.description === 'string') {
                    existing.description = valueSchema.description;
                }
                existing.deprecated = existing.deprecated || valueSchema?.deprecated === true;
            }
        }
        this.collectFromCombinatorBranches(undefined, schema, resolvedPath, refStack, depth, (branch, nextPath, nextStack, nextDepth) => {
            this.collectObjectPropertyCandidates(branch, nextPath, nextStack, out, nextDepth);
            return [];
        });
    }
    collectFromCombinatorBranches(out, schema, schemaPath, refStack, depth, collect) {
        const branchArrays = [
            this.readSchemaArray(schema.allOf),
            this.readSchemaArray(schema.oneOf),
            this.readSchemaArray(schema.anyOf),
        ];
        for (const branches of branchArrays) {
            for (const branch of branches) {
                const collected = collect(branch, schemaPath, new Set(refStack), depth + 1);
                if (out) {
                    this.pushUniqueSchemaCandidates(out, collected);
                }
            }
        }
        const thenSchema = this.isRecord(schema.then) ? schema.then : undefined;
        if (thenSchema) {
            const collected = collect(thenSchema, schemaPath, new Set(refStack), depth + 1);
            if (out) {
                this.pushUniqueSchemaCandidates(out, collected);
            }
        }
        const elseSchema = this.isRecord(schema.else) ? schema.else : undefined;
        if (elseSchema) {
            const collected = collect(elseSchema, schemaPath, new Set(refStack), depth + 1);
            if (out) {
                this.pushUniqueSchemaCandidates(out, collected);
            }
        }
    }
    pushCandidateFromRaw(target, rawSchema, schemaPath, refStack) {
        const candidate = this.dereferenceSchema(rawSchema, schemaPath, refStack);
        if (!candidate) {
            return;
        }
        this.pushUniqueSchemaCandidates(target, [{
                schema: candidate.schema,
                schemaPath: candidate.schemaPath,
            }]);
    }
    pushUniqueSchemaCandidates(target, incoming) {
        for (const candidate of incoming) {
            const exists = target.some((current) => current.schema === candidate.schema
                && current.schemaPath === candidate.schemaPath);
            if (!exists) {
                target.push(candidate);
            }
        }
    }
}
exports.CobblemonSchemaEngine = CobblemonSchemaEngine;
//# sourceMappingURL=schema-engine.js.map