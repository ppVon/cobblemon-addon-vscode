import * as vscode from 'vscode';
import { type ErrorObject } from 'ajv/dist/2020';
import { findNodeAtLocation, printParseErrorCode } from './jsonc-parser';
import { type ParsedJsonFile } from '../types';

type VerboseErrorObject = ErrorObject & { parentSchema?: unknown };

interface TypeDiscriminatorContext {
  actualType?: string;
  selectedRequired: Set<string>;
  hasTypeEnumError: boolean;
  hasNonBranchDescendantError: boolean;
}

interface TypeDiscriminatorBranchContext {
  actualType?: string;
  requiredByType: Map<string, Set<string>>;
}

export function createParseDiagnostics(parsed: ParsedJsonFile): vscode.Diagnostic[] {
  return parsed.parseErrors.map((error) => {
    const range = offsetsToRange(parsed.lineOffsets, parsed.text.length, error.offset, Math.max(error.length, 1));
    return new vscode.Diagnostic(
      range,
      `JSON parse error: ${printParseErrorCode(error.error)}`,
      vscode.DiagnosticSeverity.Error
    );
  });
}

export function createAjvDiagnostic(parsed: ParsedJsonFile, err: ErrorObject): vscode.Diagnostic {
  const instancePath = err.instancePath ?? '';
  const pointer = instancePath ? decodeJsonPointer(instancePath) : [];

  const range = rangeForPointer(parsed, pointer);
  const message = formatAjvErrorMessage(err);
  const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error);
  diagnostic.source = 'cobblemon-schema-tools';
  return diagnostic;
}

export function simplifyAjvErrors(errors: ErrorObject[], rootData: unknown): ErrorObject[] {
  const contextualErrors = errors as VerboseErrorObject[];
  const typeContexts = buildTypeDiscriminatorContexts(contextualErrors, rootData);
  const structuralKeywords = new Set(['anyOf', 'oneOf', 'if']);
  const filtered = contextualErrors.filter((err) => {
    if (isTypeBranchNoise(err, typeContexts)) {
      return false;
    }

    if (isCombinatorParentTypeNoise(err, contextualErrors, structuralKeywords)) {
      return false;
    }

    if (!structuralKeywords.has(err.keyword)) {
      return true;
    }

    const prefix = err.instancePath.length > 0 ? `${err.instancePath}/` : '/';
    const hasMoreSpecific = contextualErrors.some((other) =>
      other !== err
      && !structuralKeywords.has(other.keyword)
      && (other.instancePath === err.instancePath || other.instancePath.startsWith(prefix))
    );

    return !hasMoreSpecific;
  });

  const seen = new Set<string>();
  const unique: ErrorObject[] = [];
  for (const err of filtered) {
    const key = `${err.keyword}|${err.instancePath}|${err.schemaPath}|${JSON.stringify(err.params)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(err);
  }

  return unique;
}

function isCombinatorParentTypeNoise(
  err: VerboseErrorObject,
  errors: VerboseErrorObject[],
  structuralKeywords: Set<string>
): boolean {
  if (err.keyword !== 'type') {
    return false;
  }

  const expectedType = (err.params as { type?: string }).type;
  if (!expectedType) {
    return false;
  }

  const prefix = err.instancePath.length > 0 ? `${err.instancePath}/` : '/';
  return errors.some((other) =>
    other !== err
    && !structuralKeywords.has(other.keyword)
    && other.instancePath.startsWith(prefix)
  );
}

function isTypeBranchNoise(
  err: VerboseErrorObject,
  typeContexts: Map<string, TypeDiscriminatorContext>
): boolean {
  if (err.keyword === 'required') {
    const missing = (err.params as { missingProperty?: string }).missingProperty;
    const context = typeContexts.get(err.instancePath);
    if (!missing || !context?.actualType) {
      return false;
    }

    if (context.selectedRequired.size > 0) {
      return !context.selectedRequired.has(missing);
    }

    return context.hasTypeEnumError || context.hasNonBranchDescendantError;
  }

  if (err.keyword === 'const' && err.instancePath.endsWith('/type')) {
    const context = typeContexts.get(parentJsonPointer(err.instancePath));
    if (!context?.actualType) {
      return false;
    }

    if (context.hasTypeEnumError || context.hasNonBranchDescendantError) {
      return true;
    }

    if (context.selectedRequired.size === 0) {
      return false;
    }

    const allowedValue = (err.params as { allowedValue?: unknown }).allowedValue;
    return allowedValue !== context.actualType;
  }

  return false;
}

function buildTypeDiscriminatorContexts(
  errors: VerboseErrorObject[],
  rootData: unknown
): Map<string, TypeDiscriminatorContext> {
  const branchContexts = new Map<string, TypeDiscriminatorBranchContext>();

  for (const err of errors) {
    const parentSchema = asRecord(err.parentSchema);
    if (!parentSchema) {
      continue;
    }

    const expectedType = extractExpectedTypeFromParentSchema(parentSchema);
    if (!expectedType) {
      continue;
    }

    const objectPath = inferDiscriminatorObjectPath(err.instancePath);
    if (objectPath === undefined) {
      continue;
    }

    let branchContext = branchContexts.get(objectPath);
    if (!branchContext) {
      branchContext = {
        actualType: readTypeAtPath(rootData, objectPath),
        requiredByType: new Map<string, Set<string>>(),
      };
      branchContexts.set(objectPath, branchContext);
    }

    let requiredFields = branchContext.requiredByType.get(expectedType);
    if (!requiredFields) {
      requiredFields = new Set<string>();
      branchContext.requiredByType.set(expectedType, requiredFields);
    }

    for (const field of collectRequiredFieldsFromBranch(parentSchema)) {
      requiredFields.add(field);
    }
  }

  const resolved = new Map<string, TypeDiscriminatorContext>();
  for (const [pathKey, context] of branchContexts.entries()) {
    const selectedRequired = context.actualType
      ? (context.requiredByType.get(context.actualType) ?? new Set<string>())
      : new Set<string>();

    let hasTypeEnumError = false;
    let hasNonBranchDescendantError = false;
    const typePath = `${pathKey}/type`;
    const prefix = `${pathKey}/`;

    for (const err of errors) {
      if ((err.keyword === 'enum' || err.keyword === 'type') && err.instancePath === typePath) {
        hasTypeEnumError = true;
      }

      if (err.instancePath === typePath || !err.instancePath.startsWith(prefix)) {
        continue;
      }

      if (!['anyOf', 'oneOf', 'if', 'const', 'required'].includes(err.keyword)) {
        hasNonBranchDescendantError = true;
      }
    }

    resolved.set(pathKey, {
      actualType: context.actualType,
      selectedRequired,
      hasTypeEnumError,
      hasNonBranchDescendantError,
    });
  }

  return resolved;
}

function inferDiscriminatorObjectPath(instancePath: string): string | undefined {
  if (!instancePath) {
    return undefined;
  }

  if (instancePath.endsWith('/type')) {
    return parentJsonPointer(instancePath);
  }

  return instancePath;
}

function extractExpectedTypeFromParentSchema(parentSchema: Record<string, unknown>): string | undefined {
  const properties = asRecord(parentSchema.properties);
  const typeSchema = asRecord(properties?.type);
  const expected = typeSchema?.const;
  return typeof expected === 'string' ? expected : undefined;
}

function collectRequiredFieldsFromBranch(parentSchema: Record<string, unknown>): Set<string> {
  const requiredFields = new Set<string>();
  for (const field of readStringArray(parentSchema.required)) {
    requiredFields.add(field);
  }

  addRequiredFromCombinator(parentSchema.anyOf, requiredFields);
  addRequiredFromCombinator(parentSchema.oneOf, requiredFields);
  return requiredFields;
}

function addRequiredFromCombinator(value: unknown, output: Set<string>): void {
  if (!Array.isArray(value)) {
    return;
  }

  for (const item of value) {
    const schema = asRecord(item);
    if (!schema) {
      continue;
    }
    for (const field of readStringArray(schema.required)) {
      output.add(field);
    }
  }
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const values: string[] = [];
  for (const item of value) {
    if (typeof item === 'string') {
      values.push(item);
    }
  }
  return values;
}

function readTypeAtPath(rootData: unknown, objectPath: string): string | undefined {
  const value = getValueAtPointer(rootData, objectPath);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const typeValue = (value as Record<string, unknown>).type;
  return typeof typeValue === 'string' ? typeValue : undefined;
}

function getValueAtPointer(rootData: unknown, pointer: string): unknown {
  const segments = decodeJsonPointer(pointer);
  let current: unknown = rootData;

  for (const segment of segments) {
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

    const record = current as Record<string, unknown>;
    if (!(segment in record)) {
      return undefined;
    }

    current = record[segment];
  }

  return current;
}

function parentJsonPointer(pointer: string): string {
  const slashIndex = pointer.lastIndexOf('/');
  if (slashIndex <= 0) {
    return '';
  }
  return pointer.slice(0, slashIndex);
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function formatAjvErrorMessage(err: ErrorObject): string {
  if (err.keyword === 'required') {
    const missing = (err.params as { missingProperty?: string }).missingProperty;
    if (missing) {
      return `Missing required property '${missing}'.`;
    }
  }

  if (err.keyword === 'additionalProperties') {
    const extra = (err.params as { additionalProperty?: string }).additionalProperty;
    if (extra) {
      return `Unknown property '${extra}'.`;
    }
  }

  if (err.keyword === 'enum') {
    const allowed = (err.params as { allowedValues?: unknown[] }).allowedValues ?? [];
    const formatted = allowed
      .slice(0, 8)
      .map((value) => JSON.stringify(value))
      .join(', ');
    const suffix = allowed.length > 8 ? ', ...' : '';
    return `Value must be one of: ${formatted}${suffix}.`;
  }

  if (err.keyword === 'const') {
    const expected = (err.params as { allowedValue?: unknown }).allowedValue;
    return `Value must be ${JSON.stringify(expected)}.`;
  }

  if (err.keyword === 'type') {
    const expectedType = (err.params as { type?: string }).type;
    if (expectedType) {
      return `Expected type '${expectedType}'.`;
    }
  }

  if (err.keyword === 'minProperties') {
    const limit = (err.params as { limit?: number }).limit;
    if (typeof limit === 'number') {
      const suffix = limit === 1 ? 'property' : 'properties';
      return `Object must define at least ${limit} ${suffix}.`;
    }
  }

  if (err.keyword === 'not') {
    const parentSchema = asRecord((err as VerboseErrorObject).parentSchema);
    const notSchema = asRecord(parentSchema?.not);
    if (notSchema) {
      const maxProperties = notSchema.maxProperties;
      if (typeof maxProperties === 'number') {
        const suffix = maxProperties === 1 ? 'property' : 'properties';
        return `Object must define more than ${maxProperties} ${suffix}.`;
      }

      const disallowed = readStringArray(notSchema.required);
      if (disallowed.length === 1) {
        return `Property '${disallowed[0]}' is not allowed in this context.`;
      }
      if (disallowed.length > 1) {
        return `These properties are not allowed in this context: ${disallowed.join(', ')}.`;
      }
    }

    return 'Value matches a disallowed schema shape.';
  }

  if (err.keyword === 'oneOf') {
    return 'Value must match exactly one supported schema shape.';
  }

  if (err.keyword === 'anyOf') {
    return 'Value does not match any supported schema shape.';
  }

  return err.message ?? 'Validation failed';
}

export function createCustomDiagnostic(
  parsed: ParsedJsonFile,
  message: string,
  severity: vscode.DiagnosticSeverity,
  pointer: Array<string | number>
): vscode.Diagnostic {
  return new vscode.Diagnostic(rangeForPointer(parsed, pointer), message, severity);
}

export function addDiagnostics(store: Map<string, vscode.Diagnostic[]>, uri: vscode.Uri, diagnostics: vscode.Diagnostic[]): void {
  if (diagnostics.length === 0) {
    return;
  }

  const key = uri.toString();
  const existing = store.get(key) ?? [];
  existing.push(...diagnostics);
  store.set(key, existing);
}

function rangeForPointer(parsed: ParsedJsonFile, pointer: Array<string | number>): vscode.Range {
  const node = parsed.root ? findNodeAtLocation(parsed.root, pointer) : undefined;
  if (!node) {
    return new vscode.Range(0, 0, 0, 1);
  }
  return offsetsToRange(parsed.lineOffsets, parsed.text.length, node.offset, Math.max(node.length, 1));
}

function decodeJsonPointer(pointer: string): Array<string | number> {
  if (!pointer || pointer === '/') {
    return [];
  }

  return pointer
    .split('/')
    .slice(1)
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'))
    .map((segment) => (/^[0-9]+$/.test(segment) ? Number.parseInt(segment, 10) : segment));
}

function offsetsToRange(lineOffsets: number[], textLength: number, offset: number, length: number): vscode.Range {
  const start = offsetToPosition(lineOffsets, Math.max(0, Math.min(offset, textLength)));
  const end = offsetToPosition(lineOffsets, Math.max(0, Math.min(offset + length, textLength)));
  return new vscode.Range(start, end);
}

function offsetToPosition(lineOffsets: number[], offset: number): vscode.Position {
  let low = 0;
  let high = lineOffsets.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (lineOffsets[mid] > offset) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }

  const line = Math.max(0, low - 1);
  return new vscode.Position(line, offset - lineOffsets[line]);
}
