import * as path from 'path';
import * as vscode from 'vscode';
import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020';
import { type ParsedJsonFile, type SchemaIndexEntry, type SchemaResolution } from '../types';
import { normalizePath } from '../core/utils';
import { createAjvDiagnostic, createParseDiagnostics, simplifyAjvErrors } from '../core/diagnostics';

export interface SchemaObjectPropertySuggestion {
  key: string;
  required: boolean;
  description?: string;
  deprecated: boolean;
  placeholder: unknown;
}

interface PlaceholderOptions {
  shallowContainers?: boolean;
}

interface SchemaNodeCandidate {
  schema: Record<string, unknown>;
  schemaPath: string;
}

export class CobblemonSchemaEngine {
  private readonly ajv = new Ajv2020({ allErrors: true, strict: false, allowUnionTypes: true, verbose: true });
  private readonly schemaByPath = new Map<string, unknown>();
  private readonly schemaPathById = new Map<string, string>();
  private readonly validators = new Map<string, ValidateFunction>();
  private readonly schemaNameByPath = new Map<string, string>();

  private readonly folderSchemas = new Map<string, string>();
  private readonly fixedDataSchemas = new Map<string, Map<string, string>>();

  async initialize(context: vscode.ExtensionContext): Promise<void> {
    const schemaRoot = vscode.Uri.joinPath(context.extensionUri, 'schemas');
    const indexUri = vscode.Uri.joinPath(schemaRoot, 'index.json');

    const rawIndex = await vscode.workspace.fs.readFile(indexUri);
    const index = JSON.parse(Buffer.from(rawIndex).toString('utf8')) as { schemas: SchemaIndexEntry[] };

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

  getSchemaForPath(filePath: string): SchemaResolution | undefined {
    const normalized = normalizePath(filePath);

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

  validateJsonFile(parsed: ParsedJsonFile, schemaPath: string): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];

    if (parsed.parseErrors.length > 0) {
      diagnostics.push(...createParseDiagnostics(parsed));
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

    const errors = simplifyAjvErrors(validator.errors ?? [], parsed.value);
    for (const err of errors) {
      diagnostics.push(createAjvDiagnostic(parsed, err));
    }

    return diagnostics;
  }

  getDataSchemaOptions(): Array<{ label: string; schemaPath: string }> {
    const out: Array<{ label: string; schemaPath: string }> = [];
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

  createTemplateForSchema(schemaPath: string, hintId?: string): string {
    void hintId;
    const schema = this.schemaByPath.get(schemaPath);
    const template = this.buildTemplateForSchemaNode(schema, schemaPath, new Set<string>());
    const value = template === undefined ? {} : template;
    return JSON.stringify(value, null, 2) + '\n';
  }

  getObjectPropertySuggestions(schemaPath: string, objectPath: Array<string | number>): SchemaObjectPropertySuggestion[] {
    const rootSchema = this.schemaByPath.get(schemaPath);
    if (!this.isRecord(rootSchema)) {
      return [];
    }

    const candidates = this.getSchemaCandidatesAtPath(rootSchema, schemaPath, objectPath);
    const propertyMap = new Map<string, {
      required: boolean;
      schema?: Record<string, unknown>;
      schemaPath: string;
      description?: string;
      deprecated: boolean;
    }>();

    for (const candidate of candidates) {
      this.collectObjectPropertyCandidates(
        candidate.schema,
        candidate.schemaPath,
        new Set<string>(),
        propertyMap,
        0
      );
    }

    const output: SchemaObjectPropertySuggestion[] = [];
    for (const [key, details] of propertyMap.entries()) {
      const placeholder = details.schema
        ? (this.buildTemplateForSchemaNode(details.schema, details.schemaPath, new Set<string>()) ?? '')
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

  getPropertyPlaceholder(
    schemaPath: string,
    objectPath: Array<string | number>,
    propertyName: string,
    options?: PlaceholderOptions
  ): unknown {
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

  private wrapResolution(schemaPath: string): SchemaResolution | undefined {
    if (!this.validators.has(schemaPath)) {
      return undefined;
    }

    const schemaName = this.schemaNameByPath.get(schemaPath) ?? schemaPath;
    return { schemaPath, schemaName };
  }

  private resolveValidator(entry: SchemaIndexEntry): ValidateFunction | undefined {
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

  private indexSchemaMatcher(schemaPath: string): void {
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

  private addFixedSchema(folder: string, fileName: string, schemaPath: string): void {
    let folderMap = this.fixedDataSchemas.get(folder);
    if (!folderMap) {
      folderMap = new Map<string, string>();
      this.fixedDataSchemas.set(folder, folderMap);
    }
    folderMap.set(fileName, schemaPath);
  }

  private async loadSchemasRecursive(uri: vscode.Uri, relativeRoot: string): Promise<void> {
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
      const schema = JSON.parse(text) as Record<string, unknown>;

      this.schemaByPath.set(rel, schema);
      if (typeof schema.$id === 'string') {
        this.schemaPathById.set(schema.$id, rel);
      }
      const schemaId = typeof schema.$id === 'string' ? schema.$id : rel;
      this.ajv.addSchema(schema, schemaId);
    }
  }

  private buildTemplateForSchemaNode(
    rawSchema: unknown,
    schemaPath: string,
    refStack: Set<string>
  ): unknown {
    const dereferenced = this.dereferenceSchema(rawSchema, schemaPath, refStack);
    if (!dereferenced) {
      return undefined;
    }

    const { schema, schemaPath: resolvedPath } = dereferenced;
    const allOf = this.readSchemaArray(schema.allOf);
    if (allOf.length > 0) {
      const merged: Record<string, unknown> = {};
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

  private buildTemplateFromBranch(
    schema: Record<string, unknown>,
    schemaPath: string,
    branches: Record<string, unknown>[],
    refStack: Set<string>
  ): unknown {
    const base = this.buildTemplateWithoutCombinators(schema, schemaPath, refStack);
    let selectedBranch: unknown = undefined;
    for (const branch of branches) {
      const branchTemplate = this.buildTemplateForSchemaNode(branch, schemaPath, new Set(refStack));
      if (branchTemplate !== undefined) {
        selectedBranch = branchTemplate;
        break;
      }
    }

    if (this.isRecord(base) && this.isRecord(selectedBranch)) {
      const merged: Record<string, unknown> = {};
      this.mergeTemplateObjectInto(merged, base);
      this.mergeTemplateObjectInto(merged, selectedBranch);
      return merged;
    }

    return selectedBranch === undefined ? base : selectedBranch;
  }

  private buildTemplateWithoutCombinators(
    schema: Record<string, unknown>,
    schemaPath: string,
    refStack: Set<string>
  ): unknown {
    if (this.isArraySchema(schema)) {
      return this.buildArrayTemplate(schema, schemaPath, refStack);
    }

    if (this.isObjectSchema(schema)) {
      const required = this.readStringArray(schema.required);
      const properties = this.isRecord(schema.properties) ? schema.properties : undefined;
      const result: Record<string, unknown> = {};
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

  private primitivePlaceholderForSchema(
    schema: Record<string, unknown>,
    schemaPath: string,
    refStack: Set<string>
  ): unknown {
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

  private buildArrayTemplate(
    schema: Record<string, unknown>,
    schemaPath: string,
    refStack: Set<string>
  ): unknown[] {
    void schema;
    void schemaPath;
    void refStack;
    return [];
  }

  private dereferenceSchema(
    rawSchema: unknown,
    currentSchemaPath: string,
    refStack: Set<string>
  ): { schema: Record<string, unknown>; schemaPath: string } | undefined {
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

  private resolveRef(
    refValue: string,
    currentSchemaPath: string
  ): { schemaPath: string; schema: unknown; pointer: string } | undefined {
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
      } else {
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

  private readJsonPointer(root: unknown, pointer: string): unknown {
    const normalized = pointer.startsWith('/') ? pointer.slice(1) : pointer;
    if (normalized.length === 0) {
      return root;
    }

    let current: unknown = root;
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

  private mergeTemplateObjectInto(target: Record<string, unknown>, source: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(source)) {
      const existing = target[key];
      if (this.isRecord(existing) && this.isRecord(value)) {
        this.mergeTemplateObjectInto(existing, value);
        continue;
      }
      target[key] = value;
    }
  }

  private readPrimaryType(rawType: unknown): string | undefined {
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

  private isArraySchema(schema: Record<string, unknown>): boolean {
    return this.readPrimaryType(schema.type) === 'array' || schema.items !== undefined;
  }

  private isObjectSchema(schema: Record<string, unknown>): boolean {
    return this.readPrimaryType(schema.type) === 'object' || schema.properties !== undefined || schema.required !== undefined;
  }

  private readSchemaArray(value: unknown): Array<Record<string, unknown>> {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter((item): item is Record<string, unknown> => this.isRecord(item));
  }

  private readStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter((item): item is string => typeof item === 'string');
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  private getSchemaCandidatesAtPath(
    rootSchema: Record<string, unknown>,
    rootSchemaPath: string,
    pathSegments: Array<string | number>
  ): SchemaNodeCandidate[] {
    let current: SchemaNodeCandidate[] = [{ schema: rootSchema, schemaPath: rootSchemaPath }];
    for (const segment of pathSegments) {
      const next: SchemaNodeCandidate[] = [];
      for (const candidate of current) {
        const segmentMatches = typeof segment === 'number'
          ? this.collectArrayChildCandidates(candidate.schema, candidate.schemaPath, segment, new Set<string>(), 0)
          : this.collectPropertyChildCandidates(candidate.schema, candidate.schemaPath, segment, new Set<string>(), 0);
        this.pushUniqueSchemaCandidates(next, segmentMatches);
      }
      if (next.length === 0) {
        return [];
      }
      current = next;
    }

    return current;
  }

  private collectPropertyChildCandidates(
    rawSchema: unknown,
    schemaPath: string,
    propertyName: string,
    refStack: Set<string>,
    depth: number
  ): SchemaNodeCandidate[] {
    if (depth > 24) {
      return [];
    }

    const dereferenced = this.dereferenceSchema(rawSchema, schemaPath, refStack);
    if (!dereferenced) {
      return [];
    }

    const { schema, schemaPath: resolvedPath } = dereferenced;
    const out: SchemaNodeCandidate[] = [];

    const properties = this.isRecord(schema.properties) ? schema.properties : undefined;
    const direct = properties ? properties[propertyName] : undefined;
    if (this.isRecord(direct)) {
      this.pushCandidateFromRaw(out, direct, resolvedPath, new Set(refStack));
    }

    if (direct === undefined && this.isRecord(schema.additionalProperties)) {
      this.pushCandidateFromRaw(out, schema.additionalProperties, resolvedPath, new Set(refStack));
    }

    this.collectFromCombinatorBranches(
      out,
      schema,
      resolvedPath,
      refStack,
      depth,
      (branch, nextPath, nextStack, nextDepth) => this.collectPropertyChildCandidates(
        branch,
        nextPath,
        propertyName,
        nextStack,
        nextDepth
      )
    );

    return out;
  }

  private collectArrayChildCandidates(
    rawSchema: unknown,
    schemaPath: string,
    index: number,
    refStack: Set<string>,
    depth: number
  ): SchemaNodeCandidate[] {
    if (depth > 24) {
      return [];
    }

    const dereferenced = this.dereferenceSchema(rawSchema, schemaPath, refStack);
    if (!dereferenced) {
      return [];
    }

    const { schema, schemaPath: resolvedPath } = dereferenced;
    const out: SchemaNodeCandidate[] = [];

    const prefixItems = this.readSchemaArray(schema.prefixItems);
    if (index < prefixItems.length) {
      this.pushCandidateFromRaw(out, prefixItems[index], resolvedPath, new Set(refStack));
    } else if (this.isRecord(schema.items)) {
      this.pushCandidateFromRaw(out, schema.items, resolvedPath, new Set(refStack));
    } else if (Array.isArray(schema.items) && index < schema.items.length && this.isRecord(schema.items[index])) {
      this.pushCandidateFromRaw(out, schema.items[index], resolvedPath, new Set(refStack));
    }

    this.collectFromCombinatorBranches(
      out,
      schema,
      resolvedPath,
      refStack,
      depth,
      (branch, nextPath, nextStack, nextDepth) => this.collectArrayChildCandidates(
        branch,
        nextPath,
        index,
        nextStack,
        nextDepth
      )
    );

    return out;
  }

  private collectObjectPropertyCandidates(
    rawSchema: unknown,
    schemaPath: string,
    refStack: Set<string>,
    out: Map<string, {
      required: boolean;
      schema?: Record<string, unknown>;
      schemaPath: string;
      description?: string;
      deprecated: boolean;
    }>,
    depth: number
  ): void {
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
      } else {
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

    this.collectFromCombinatorBranches(
      undefined,
      schema,
      resolvedPath,
      refStack,
      depth,
      (branch, nextPath, nextStack, nextDepth) => {
        this.collectObjectPropertyCandidates(branch, nextPath, nextStack, out, nextDepth);
        return [];
      }
    );
  }

  private collectFromCombinatorBranches(
    out: SchemaNodeCandidate[] | undefined,
    schema: Record<string, unknown>,
    schemaPath: string,
    refStack: Set<string>,
    depth: number,
    collect: (
      branch: Record<string, unknown>,
      branchSchemaPath: string,
      branchRefStack: Set<string>,
      nextDepth: number
    ) => SchemaNodeCandidate[]
  ): void {
    const branchArrays: Array<Array<Record<string, unknown>>> = [
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

  private pushCandidateFromRaw(
    target: SchemaNodeCandidate[],
    rawSchema: unknown,
    schemaPath: string,
    refStack: Set<string>
  ): void {
    const candidate = this.dereferenceSchema(rawSchema, schemaPath, refStack);
    if (!candidate) {
      return;
    }

    this.pushUniqueSchemaCandidates(target, [{
      schema: candidate.schema,
      schemaPath: candidate.schemaPath,
    }]);
  }

  private pushUniqueSchemaCandidates(target: SchemaNodeCandidate[], incoming: SchemaNodeCandidate[]): void {
    for (const candidate of incoming) {
      const exists = target.some((current) =>
        current.schema === candidate.schema
        && current.schemaPath === candidate.schemaPath
      );
      if (!exists) {
        target.push(candidate);
      }
    }
  }
}
