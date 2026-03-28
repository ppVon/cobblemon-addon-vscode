import * as path from 'path';
import * as vscode from 'vscode';
import {
  type JsObjectMember,
  type JsObjectNode,
  type JsPropertyMember,
  type JsValueNode,
  parseWorkspaceJsObject,
  rangeForJsNode,
  rangeForJsSpan,
} from '../core/js-object';
import {
  inferNamespaceFromPath,
  normalizePath,
  normalizeSlug,
  workspaceWarningSeverity,
} from '../core/utils';
import {
  ABILITY_CONDITION_DECLARATIVE_KEY_SET,
  ABILITY_FLAG_KEY_SET,
  ABILITY_NONSTANDARD_VALUE_SET,
  ABILITY_TOP_LEVEL_DECLARATIVE_KEY_SET,
  isAbilityCallbackKey,
  isAbilityCallbackLikeKey,
  isAbilityConditionCallbackKey,
  isAbilityNumericCallbackKey,
} from '../abilities/spec';
import { type CobblemonDefaultResourceIndex } from './cobblemon-default-index';

interface IndexedObjectMembers {
  readonly all: Map<string, SupportedJsObjectMember[]>;
  readonly first: Map<string, SupportedJsObjectMember>;
}

type SupportedJsObjectMember = Exclude<JsObjectMember, { kind: 'unsupported-member' }>;

const REQUIRED_ABILITY_KEYS = ['name', 'num', 'rating', 'flags'] as const;

export async function validateAbilityJsFile(
  uri: vscode.Uri,
): Promise<vscode.Diagnostic[]> {
  const parsed = await parseWorkspaceJsObject(uri);
  const diagnostics: vscode.Diagnostic[] = [];

  for (const error of parsed.parseErrors) {
    diagnostics.push(
      createDiagnostic(
        rangeForJsSpan(parsed, error.start, Math.max(error.length, 1)),
        `Ability parse error: ${error.message}`,
        vscode.DiagnosticSeverity.Error,
      ),
    );
  }

  if (parsed.parseErrors.length > 0 || !parsed.root) {
    return diagnostics;
  }

  diagnostics.push(...validateObjectStructure(parsed, parsed.root));
  diagnostics.push(...validateAbilityTopLevel(parsed, parsed.root));

  return diagnostics;
}

export async function validateAbilityLangRequirements(
  uri: vscode.Uri,
  langKeys: Set<string>,
  cobblemonDefaults: CobblemonDefaultResourceIndex,
): Promise<vscode.Diagnostic[]> {
  const parsed = await parseWorkspaceJsObject(uri);
  if (parsed.parseErrors.length > 0 || !parsed.root) {
    return [];
  }

  const normalized = normalizePath(uri.fsPath);
  const namespace = inferNamespaceFromPath(normalized, '/data/') ?? 'minecraft';
  const abilitySlug = normalizeSlug(
    path.basename(uri.fsPath).replace(/\.(js|ts)$/i, ''),
  );
  if (!abilitySlug) {
    return [];
  }

  const nameMember = parsed.root.members.find(
    (
      member,
    ): member is Extract<typeof parsed.root.members[number], { keyNode: unknown }> =>
      (member.kind === 'property' || member.kind === 'method') &&
      member.key === 'name',
  );
  const range = rangeForJsNode(parsed, nameMember?.keyNode ?? parsed.root.node);

  const diagnostics: vscode.Diagnostic[] = [];
  const nameKey = `${namespace}.ability.${abilitySlug}`;
  const descKey = `${namespace}.ability.${abilitySlug}.desc`;

  if (!langKeys.has(nameKey) && !cobblemonDefaults.langKeys.has(nameKey)) {
    diagnostics.push(
      createDiagnostic(
        range,
        `Lang key '${nameKey}' was not found in any assets/*/lang/*.json file.`,
        workspaceWarningSeverity(),
      ),
    );
  }

  if (!langKeys.has(descKey) && !cobblemonDefaults.langKeys.has(descKey)) {
    diagnostics.push(
      createDiagnostic(
        range,
        `Lang key '${descKey}' was not found in any assets/*/lang/*.json file.`,
        workspaceWarningSeverity(),
      ),
    );
  }

  return diagnostics;
}

function validateObjectStructure(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  objectNode: JsObjectNode,
): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  const seen = new Map<string, JsObjectMember>();

  for (const member of objectNode.members) {
    if (member.kind === 'unsupported-member') {
      diagnostics.push(
        createDiagnostic(
          rangeForJsNode(parsed, member.node),
          member.message,
          vscode.DiagnosticSeverity.Error,
        ),
      );
      continue;
    }

    const previous = seen.get(member.key);
    if (previous) {
      diagnostics.push(
        createDiagnostic(
          rangeForJsNode(parsed, member.keyNode),
          `You already set '${member.key}' once in this ability. Remove the extra copy.`,
          vscode.DiagnosticSeverity.Error,
        ),
      );
    } else {
      seen.set(member.key, member);
    }

    if (member.kind === 'property') {
      diagnostics.push(...validateValueStructure(parsed, member.value));
    }
  }

  return diagnostics;
}

function validateValueStructure(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  value: JsValueNode,
): vscode.Diagnostic[] {
  if (value.kind === 'unsupported') {
    return [
      createDiagnostic(
        rangeForJsNode(parsed, value.node),
        value.message,
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  if (value.kind === 'object') {
    return validateObjectStructure(parsed, value);
  }

  if (value.kind === 'array') {
    return value.elements.flatMap((element) =>
      validateValueStructure(parsed, element),
    );
  }

  return [];
}

function validateAbilityTopLevel(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  root: JsObjectNode,
): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  const members = indexObjectMembers(root);

  for (const key of REQUIRED_ABILITY_KEYS) {
    if (!members.first.has(key)) {
      diagnostics.push(
        createDiagnostic(
          rangeForJsNode(parsed, root.node),
          `This ability is missing '${key}'.`,
          vscode.DiagnosticSeverity.Error,
        ),
      );
    }
  }

  for (const [key, group] of members.all.entries()) {
    const member = group[0];
    if (ABILITY_TOP_LEVEL_DECLARATIVE_KEY_SET.has(key)) {
      continue;
    }

    if (isAbilityCallbackKey(key)) {
      diagnostics.push(...validateAbilityCallbackMember(parsed, member));
      continue;
    }

    if (isAbilityCallbackLikeKey(key)) {
      diagnostics.push(
        createDiagnostic(
          rangeForMemberKey(parsed, member),
          `The callback '${key}' is not recognized. Check the name for a typo.`,
          workspaceWarningSeverity(),
        ),
      );
      diagnostics.push(...validateLooseCallbackLikeMember(parsed, member));
      continue;
    }

    diagnostics.push(
      createDiagnostic(
        rangeForMemberKey(parsed, member),
        `'${key}' is not a recognized ability setting. Check the spelling.`,
        workspaceWarningSeverity(),
      ),
    );
  }

  diagnostics.push(
    ...validateStringProperty(parsed, members.first.get('name'), {
      label: 'name',
      optional: false,
    }),
  );
  diagnostics.push(
    ...validateNumberProperty(parsed, members.first.get('num'), {
      allowFloat: false,
      label: 'num',
      min: 0,
      optional: false,
    }),
  );
  diagnostics.push(
    ...validateNumberProperty(parsed, members.first.get('rating'), {
      allowFloat: true,
      label: 'rating',
      min: -1,
      max: 5,
      optional: false,
    }),
  );
  diagnostics.push(...validateFlagsProperty(parsed, members.first.get('flags')));
  diagnostics.push(
    ...validateBooleanProperty(parsed, members.first.get('suppressWeather'), {
      label: 'suppressWeather',
      optional: true,
    }),
  );
  diagnostics.push(
    ...validateStringEnumProperty(parsed, members.first.get('isNonstandard'), {
      allowed: ABILITY_NONSTANDARD_VALUE_SET,
      label: 'isNonstandard',
      optional: true,
    }),
  );
  diagnostics.push(
    ...validateConditionProperty(parsed, members.first.get('condition')),
  );

  return diagnostics;
}

function validateFlagsProperty(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember | undefined,
): vscode.Diagnostic[] {
  if (!member) {
    return [];
  }

  const property = asPropertyMember(member);
  if (!property || property.value.kind !== 'object') {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        "'flags' must look like 'flags: { breakable: 1 }'.",
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  const diagnostics: vscode.Diagnostic[] = [];
  const members = indexObjectMembers(property.value);

  for (const [key, group] of members.all.entries()) {
    const flagMember = group[0];
    const flagProperty = asPropertyMember(flagMember);

    if (!flagProperty) {
      diagnostics.push(
        createDiagnostic(
          rangeForMember(parsed, flagMember),
          "Inside 'flags', only flag entries like 'breakable: 1' are allowed.",
          vscode.DiagnosticSeverity.Error,
        ),
      );
      continue;
    }

    const value = readLiteralValue(flagProperty.value);
    if (value !== 1) {
      diagnostics.push(
        createDiagnostic(
          rangeForMember(parsed, flagMember),
          `Flag '${key}' must be set to 1.`,
          vscode.DiagnosticSeverity.Error,
        ),
      );
    }

    if (!ABILITY_FLAG_KEY_SET.has(key)) {
      diagnostics.push(
        createDiagnostic(
          rangeForMemberKey(parsed, flagMember),
          `'${key}' is not a recognized ability flag.`,
          workspaceWarningSeverity(),
        ),
      );
    }
  }

  return diagnostics;
}

function validateConditionProperty(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember | undefined,
): vscode.Diagnostic[] {
  if (!member) {
    return [];
  }

  const property = asPropertyMember(member);
  if (!property || property.value.kind !== 'object') {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        "'condition' must be an object like 'condition: { duration: 2 }'.",
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  const diagnostics: vscode.Diagnostic[] = [];
  const members = indexObjectMembers(property.value);

  for (const [key, group] of members.all.entries()) {
    const conditionMember = group[0];

    if (ABILITY_CONDITION_DECLARATIVE_KEY_SET.has(key)) {
      diagnostics.push(
        ...validateNumberProperty(parsed, conditionMember, {
          allowFloat: false,
          label: 'condition.duration',
          min: 1,
          optional: false,
        }),
      );
      continue;
    }

    if (isAbilityConditionCallbackKey(key)) {
      diagnostics.push(...validateKnownConditionCallbackMember(parsed, conditionMember));
      continue;
    }

    if (isAbilityCallbackLikeKey(key)) {
      diagnostics.push(
        createDiagnostic(
          rangeForMemberKey(parsed, conditionMember),
          `The condition callback '${key}' is not recognized. Check the name for a typo.`,
          workspaceWarningSeverity(),
        ),
      );
      diagnostics.push(...validateLooseCallbackLikeMember(parsed, conditionMember));
      continue;
    }

    diagnostics.push(
      createDiagnostic(
        rangeForMemberKey(parsed, conditionMember),
        `'${key}' is not a recognized condition setting. Check the spelling.`,
        workspaceWarningSeverity(),
      ),
    );
  }

  return diagnostics;
}

function validateKnownConditionCallbackMember(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: SupportedJsObjectMember,
): vscode.Diagnostic[] {
  if (isAbilityNumericCallbackKey(member.key)) {
    return validateNumericCallbackMember(parsed, member);
  }

  return validateFunctionCallbackMember(parsed, member);
}

function validateAbilityCallbackMember(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: SupportedJsObjectMember,
): vscode.Diagnostic[] {
  if (isAbilityNumericCallbackKey(member.key)) {
    return validateNumericCallbackMember(parsed, member);
  }

  return validateFunctionCallbackMember(parsed, member);
}

function validateLooseCallbackLikeMember(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: SupportedJsObjectMember,
): vscode.Diagnostic[] {
  if (isNumericCallbackLikeKey(member.key)) {
    return validateNumericCallbackMember(parsed, member);
  }

  return validateFunctionCallbackMember(parsed, member);
}

function validateNumericCallbackMember(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: SupportedJsObjectMember,
): vscode.Diagnostic[] {
  const property = asPropertyMember(member);
  const value = property ? readLiteralValue(property.value) : undefined;

  if (typeof value === 'number') {
    return [];
  }

  return [
    createDiagnostic(
      rangeForMember(parsed, member),
      `The callback '${member.key}' must be a number like '${member.key}: 1'.`,
      vscode.DiagnosticSeverity.Error,
    ),
  ];
}

function validateFunctionCallbackMember(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: SupportedJsObjectMember,
): vscode.Diagnostic[] {
  if (member.kind === 'method') {
    return [];
  }

  const property = asPropertyMember(member);
  if (property?.value.kind === 'function') {
    return [];
  }

  return [
    createDiagnostic(
      rangeForMember(parsed, member),
      `The callback '${member.key}' must be a function like '${member.key}() { ... }'.`,
      vscode.DiagnosticSeverity.Error,
    ),
  ];
}

function validateStringProperty(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember | undefined,
  options: {
    label: string;
    optional: boolean;
  },
): vscode.Diagnostic[] {
  if (!member) {
    return [];
  }

  const property = asPropertyMember(member);
  const value = property ? readLiteralValue(property.value) : undefined;
  if (typeof value === 'string') {
    return [];
  }

  return [
    createDiagnostic(
      rangeForMember(parsed, member),
      options.optional
        ? `'${options.label}' must be a string.`
        : `'${options.label}' is required and must be a string.`,
      vscode.DiagnosticSeverity.Error,
    ),
  ];
}

function validateBooleanProperty(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember | undefined,
  options: {
    label: string;
    optional: boolean;
  },
): vscode.Diagnostic[] {
  if (!member) {
    return [];
  }

  const property = asPropertyMember(member);
  const value = property ? readLiteralValue(property.value) : undefined;
  if (typeof value === 'boolean') {
    return [];
  }

  return [
    createDiagnostic(
      rangeForMember(parsed, member),
      options.optional
        ? `'${options.label}' must be true or false.`
        : `'${options.label}' is required and must be true or false.`,
      vscode.DiagnosticSeverity.Error,
    ),
  ];
}

function validateNumberProperty(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember | undefined,
  options: {
    allowFloat: boolean;
    label: string;
    min: number;
    max?: number;
    optional: boolean;
  },
): vscode.Diagnostic[] {
  if (!member) {
    return [];
  }

  const property = asPropertyMember(member);
  const value = property ? readLiteralValue(property.value) : undefined;

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        options.optional
          ? `'${options.label}' must be a number.`
          : `'${options.label}' is required and must be a number.`,
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  if (!options.allowFloat && !Number.isInteger(value)) {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        `'${options.label}' must be a whole number.`,
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  if (value < options.min) {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        `'${options.label}' must be at least ${options.min}.`,
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  if (options.max !== undefined && value > options.max) {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        `'${options.label}' must be at most ${options.max}.`,
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  return [];
}

function validateStringEnumProperty(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember | undefined,
  options: {
    allowed: ReadonlySet<string>;
    label: string;
    optional: boolean;
  },
): vscode.Diagnostic[] {
  if (!member) {
    return [];
  }

  const property = asPropertyMember(member);
  const value = property ? readLiteralValue(property.value) : undefined;

  if (typeof value !== 'string') {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        options.optional
          ? `'${options.label}' must be a string.`
          : `'${options.label}' is required and must be a string.`,
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  if (options.allowed.has(value)) {
    return [];
  }

  return [
    createDiagnostic(
      rangeForMember(parsed, member),
      `'${options.label}' must be one of: ${Array.from(options.allowed).join(', ')}.`,
      vscode.DiagnosticSeverity.Error,
    ),
  ];
}

function indexObjectMembers(objectNode: JsObjectNode): IndexedObjectMembers {
  const all = new Map<string, SupportedJsObjectMember[]>();
  const first = new Map<string, SupportedJsObjectMember>();

  for (const member of objectNode.members) {
    if (member.kind === 'unsupported-member') {
      continue;
    }

    const existing = all.get(member.key) ?? [];
    existing.push(member);
    all.set(member.key, existing);

    if (!first.has(member.key)) {
      first.set(member.key, member);
    }
  }

  return { all, first };
}

function asPropertyMember(member: JsObjectMember): JsPropertyMember | undefined {
  return member.kind === 'property' ? member : undefined;
}

function readLiteralValue(
  value: JsValueNode,
): string | number | boolean | null | undefined {
  return value.kind === 'literal' ? value.value : undefined;
}

function isNumericCallbackLikeKey(key: string): boolean {
  return /^on[A-Z].*(Priority|Order|SubOrder)$/.test(key);
}

function rangeForMember(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember | undefined,
): vscode.Range {
  if (!member) {
    return new vscode.Range(0, 0, 0, 0);
  }

  return rangeForJsNode(parsed, member.node);
}

function rangeForMemberKey(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember,
): vscode.Range {
  if (member.kind === 'unsupported-member') {
    return rangeForJsNode(parsed, member.node);
  }

  return rangeForJsNode(parsed, member.keyNode);
}

function createDiagnostic(
  range: vscode.Range,
  message: string,
  severity: vscode.DiagnosticSeverity,
): vscode.Diagnostic {
  const diagnostic = new vscode.Diagnostic(range, message, severity);
  diagnostic.source = 'cobblemon-schema-tools';
  return diagnostic;
}
