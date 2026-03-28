import {
  ABILITY_FLAG_KEYS,
  ABILITY_TEMPLATE_FIELD_ORDER,
  type AbilityTemplateDefinition,
  isValidJsIdentifierKey,
} from '../../abilities/spec';
import { type AbilityBuilderFormData } from './types';

export interface BuildAbilityTemplateOptions {
  abilityDataImportPath?: string;
}

export function buildAbilityTemplate(
  formData: AbilityBuilderFormData,
  options: BuildAbilityTemplateOptions = {},
): string {
  const definition = buildAbilityDefinition(formData);
  const ordered = buildOrderedAbilityRecord(definition);
  const objectBody = `{\n${renderObjectBody(ordered, 1)}\n}`;
  if (options.abilityDataImportPath) {
    return `// This ability uses Typescript-only typing helpers.\n// You MUST use "Cobblemon: Package Addon Zip" before putting this addon into the game.\nimport type { AbilityData } from ${JSON.stringify(options.abilityDataImportPath)};\n\n(${objectBody} satisfies AbilityData);\n`;
  }
  return `(${objectBody})\n`;
}

function buildAbilityDefinition(
  formData: AbilityBuilderFormData,
): AbilityTemplateDefinition {
  const definition: AbilityTemplateDefinition = {
    num: formData.abilityNumber.trim().length > 0
      ? Number.parseInt(formData.abilityNumber.trim(), 10)
      : 1000,
    name: formData.abilityName.trim(),
    rating: Number.parseFloat(formData.rating.trim()),
    flags: buildFlags(formData.selectedFlags),
  };

  if (formData.suppressWeather) {
    definition.suppressWeather = true;
  }

  if (formData.isNonstandard.trim().length > 0) {
    definition.isNonstandard = formData.isNonstandard.trim();
  }

  return definition;
}

function buildFlags(selectedFlags: string[]): Record<string, 1> {
  const flagSet = new Set(selectedFlags);
  const entries: Array<[string, 1]> = [];
  for (const flag of ABILITY_FLAG_KEYS) {
    if (flagSet.has(flag)) {
      entries.push([flag, 1]);
    }
  }
  for (const flag of selectedFlags) {
    if (!entries.some(([existing]) => existing === flag)) {
      entries.push([flag, 1]);
    }
  }
  return Object.fromEntries(entries);
}

function buildOrderedAbilityRecord(
  definition: AbilityTemplateDefinition,
): Record<string, unknown> {
  const ordered: Record<string, unknown> = {};

  for (const key of ABILITY_TEMPLATE_FIELD_ORDER) {
    const value = definition[key as keyof AbilityTemplateDefinition];
    if (value === undefined) {
      continue;
    }

    if (key === 'flags') {
      ordered[key] = orderRecord(value as Record<string, unknown>, [
        ...ABILITY_FLAG_KEYS,
      ]);
      continue;
    }

    ordered[key] = value;
  }

  return ordered;
}

function orderRecord(
  value: Record<string, unknown>,
  preferredKeys: readonly string[],
): Record<string, unknown> {
  const ordered: Record<string, unknown> = {};
  const seen = new Set<string>();

  for (const key of preferredKeys) {
    if (!(key in value)) {
      continue;
    }
    seen.add(key);
    ordered[key] = value[key];
  }

  for (const [key, entry] of Object.entries(value)) {
    if (seen.has(key)) {
      continue;
    }
    ordered[key] = entry;
  }

  return ordered;
}

function renderObjectBody(
  value: Record<string, unknown>,
  indentLevel: number,
): string {
  return Object.entries(value)
    .map(
      ([key, entry]) =>
        `${indent(indentLevel)}${renderKey(key)}: ${renderValue(entry, indentLevel)},`,
    )
    .join('\n');
}

function renderValue(value: unknown, indentLevel: number): string {
  if (value === null) {
    return 'null';
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    if (value.every(isInlineRenderable)) {
      return `[${value.map((item) => renderValue(item, indentLevel)).join(', ')}]`;
    }

    const inner = value
      .map((item) => `${indent(indentLevel + 1)}${renderValue(item, indentLevel + 1)},`)
      .join('\n');
    return `[\n${inner}\n${indent(indentLevel)}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return '{}';
    }

    if (
      entries.every(([, entry]) => isInlineRenderable(entry)) &&
      entries.length <= 4
    ) {
      return `{${entries
        .map(([key, entry]) => `${renderKey(key)}: ${renderValue(entry, indentLevel)}`)
        .join(', ')}}`;
    }

    return `{\n${renderObjectBody(value as Record<string, unknown>, indentLevel + 1)}\n${indent(indentLevel)}}`;
  }

  return 'null';
}

function renderKey(key: string): string {
  return isValidJsIdentifierKey(key) ? key : JSON.stringify(key);
}

function isInlineRenderable(value: unknown): boolean {
  if (value === null) {
    return true;
  }
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(
      (item) =>
        item === null
        || typeof item === 'string'
        || typeof item === 'number'
        || typeof item === 'boolean',
    );
  }
  return false;
}

function indent(level: number): string {
  return '  '.repeat(level);
}
