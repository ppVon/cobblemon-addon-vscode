import * as path from 'path';
import * as vscode from 'vscode';
import {
  type JsMethodMember,
  type JsObjectMember,
  type JsObjectNode,
  type JsPropertyMember,
  type JsValueNode,
  parseWorkspaceJsObject,
  rangeForJsNode,
  rangeForJsSpan,
} from '../core/js-object';
import {
  MOVE_BOOST_KEY_SET,
  MOVE_CATEGORY_SET,
  MOVE_CONDITION_DECLARATIVE_KEY_SET,
  MOVE_CONTEST_TYPE_SET,
  MOVE_FLAG_SET,
  MOVE_SELFDESTRUCT_VALUE_SET,
  MOVE_SELF_SWITCH_VALUE_SET,
  MOVE_STATUS_CODE_SET,
  MOVE_TARGET_SET,
  MOVE_TOP_LEVEL_DECLARATIVE_KEY_SET,
  MOVE_TYPE_SET,
  isMoveCallbackKey,
} from '../moves/spec';
import { normalizeSlug, workspaceWarningSeverity } from '../core/utils';

interface IndexedObjectMembers {
  readonly all: Map<string, JsObjectMember[]>;
  readonly first: Map<string, JsObjectMember>;
}

export async function validateMoveJsFile(
  uri: vscode.Uri,
): Promise<vscode.Diagnostic[]> {
  const parsed = await parseWorkspaceJsObject(uri);
  const diagnostics: vscode.Diagnostic[] = [];

  for (const error of parsed.parseErrors) {
    diagnostics.push(
      createDiagnostic(
        rangeForJsSpan(parsed, error.start, Math.max(error.length, 1)),
        `JS parse error: ${error.message}`,
        vscode.DiagnosticSeverity.Error,
      ),
    );
  }

  if (parsed.parseErrors.length > 0 || !parsed.root) {
    return diagnostics;
  }

  diagnostics.push(...validateObjectStructure(parsed, parsed.root));
  diagnostics.push(...validateMoveTopLevel(parsed, parsed.root));

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
          `Duplicate property '${member.key}'.`,
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

function validateMoveTopLevel(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  root: JsObjectNode,
): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  const members = indexObjectMembers(root);

  const requiredKeys = [
    'accuracy',
    'basePower',
    'category',
    'name',
    'pp',
    'priority',
    'flags',
    'secondary',
    'target',
    'type',
  ];

  for (const key of requiredKeys) {
    if (!members.first.has(key)) {
      diagnostics.push(
        createDiagnostic(
          rangeForJsNode(parsed, root.node),
          `Missing required move property '${key}'.`,
          vscode.DiagnosticSeverity.Error,
        ),
      );
    }
  }

  for (const [key, group] of members.all.entries()) {
    if (group.length === 0) {
      continue;
    }
    const member = group[0];
    if (!MOVE_TOP_LEVEL_DECLARATIVE_KEY_SET.has(key) && !isMoveCallbackKey(key)) {
      diagnostics.push(
        createDiagnostic(
          rangeForMemberKey(parsed, member),
          `Unknown move property '${key}'.`,
          workspaceWarningSeverity(),
        ),
      );
      continue;
    }

    if (isMoveCallbackKey(key)) {
      diagnostics.push(...validateCallbackMember(parsed, member, false));
    }
  }

  diagnostics.push(
    ...validateNumberProperty(parsed, members.first.get('num'), {
      allowFloat: false,
      min: 1,
      label: 'num',
      optional: true,
    }),
  );
  diagnostics.push(
    ...validateAccuracyProperty(parsed, members.first.get('accuracy')),
  );
  diagnostics.push(
    ...validateNumberProperty(parsed, members.first.get('basePower'), {
      allowFloat: false,
      min: 0,
      label: 'basePower',
    }),
  );
  diagnostics.push(
    ...validateStringEnumProperty(
      parsed,
      members.first.get('category'),
      MOVE_CATEGORY_SET,
      'category',
    ),
  );
  diagnostics.push(
    ...validateRequiredStringProperty(parsed, members.first.get('name'), 'name'),
  );
  diagnostics.push(
    ...validateNumberProperty(parsed, members.first.get('pp'), {
      allowFloat: false,
      min: 1,
      label: 'pp',
    }),
  );
  diagnostics.push(
    ...validateNumberProperty(parsed, members.first.get('priority'), {
      allowFloat: false,
      min: -6,
      max: 6,
      label: 'priority',
    }),
  );
  diagnostics.push(...validateFlagsProperty(parsed, members.first.get('flags')));
  diagnostics.push(
    ...validateSecondaryProperty(parsed, members.first.get('secondary')),
  );
  diagnostics.push(
    ...validateStringEnumProperty(
      parsed,
      members.first.get('target'),
      MOVE_TARGET_SET,
      'target',
    ),
  );
  diagnostics.push(
    ...validateStringEnumProperty(
      parsed,
      members.first.get('type'),
      MOVE_TYPE_SET,
      'type',
    ),
  );
  diagnostics.push(
    ...validateOptionalStringEnumProperty(
      parsed,
      members.first.get('contestType'),
      MOVE_CONTEST_TYPE_SET,
      'contestType',
    ),
  );
  diagnostics.push(
    ...validateOptionalBooleanProperty(
      parsed,
      members.first.get('forceSwitch'),
      'forceSwitch',
    ),
  );
  diagnostics.push(
    ...validateFractionProperty(parsed, members.first.get('recoil'), 'recoil'),
  );
  diagnostics.push(
    ...validateOptionalBooleanProperty(
      parsed,
      members.first.get('struggleRecoil'),
      'struggleRecoil',
    ),
  );
  diagnostics.push(
    ...validateOptionalBooleanProperty(
      parsed,
      members.first.get('mindBlownRecoil'),
      'mindBlownRecoil',
    ),
  );
  diagnostics.push(
    ...validateOptionalBooleanProperty(
      parsed,
      members.first.get('hasCrashDamage'),
      'hasCrashDamage',
    ),
  );
  diagnostics.push(
    ...validateOptionalStringEnumProperty(
      parsed,
      members.first.get('status'),
      MOVE_STATUS_CODE_SET,
      'status',
    ),
  );
  diagnostics.push(
    ...validateIdentifierLikeStringProperty(
      parsed,
      members.first.get('volatileStatus'),
      'volatileStatus',
    ),
  );
  diagnostics.push(
    ...validateIdentifierLikeStringProperty(
      parsed,
      members.first.get('sideCondition'),
      'sideCondition',
    ),
  );
  diagnostics.push(...validateBoostsProperty(parsed, members.first.get('boosts')));
  diagnostics.push(
    ...validateFractionProperty(parsed, members.first.get('drain'), 'drain'),
  );
  diagnostics.push(
    ...validateFractionProperty(parsed, members.first.get('heal'), 'heal'),
  );
  diagnostics.push(
    ...validateOptionalBooleanProperty(parsed, members.first.get('ohko'), 'ohko'),
  );
  diagnostics.push(
    ...validateNumberProperty(parsed, members.first.get('critRatio'), {
      allowFloat: false,
      min: 1,
      label: 'critRatio',
      optional: true,
    }),
  );
  diagnostics.push(
    ...validateMultihitProperty(parsed, members.first.get('multihit')),
  );
  diagnostics.push(
    ...validateOptionalBooleanProperty(
      parsed,
      members.first.get('stallingMove'),
      'stallingMove',
    ),
  );
  diagnostics.push(
    ...validateSelfSwitchProperty(parsed, members.first.get('selfSwitch')),
  );
  diagnostics.push(
    ...validateSelfdestructProperty(parsed, members.first.get('selfdestruct')),
  );
  diagnostics.push(
    ...validateOptionalStringProperty(parsed, members.first.get('isZ'), 'isZ'),
  );
  diagnostics.push(
    ...validateSimpleObjectProperty(parsed, members.first.get('zMove'), 'zMove'),
  );
  diagnostics.push(
    ...validateSimpleObjectProperty(
      parsed,
      members.first.get('maxMove'),
      'maxMove',
    ),
  );
  diagnostics.push(
    ...validateOptionalBooleanProperty(
      parsed,
      members.first.get('ignoreAbility'),
      'ignoreAbility',
    ),
  );
  diagnostics.push(
    ...validateOptionalBooleanProperty(
      parsed,
      members.first.get('ignoreImmunity'),
      'ignoreImmunity',
    ),
  );
  diagnostics.push(
    ...validateOptionalBooleanProperty(
      parsed,
      members.first.get('ignoreDefensive'),
      'ignoreDefensive',
    ),
  );
  diagnostics.push(
    ...validateOptionalBooleanProperty(
      parsed,
      members.first.get('ignoreEvasion'),
      'ignoreEvasion',
    ),
  );
  diagnostics.push(
    ...validateConditionProperty(parsed, members.first.get('condition')),
  );

  const category = readStringMemberValue(members.first.get('category'));
  const basePower = readNumericMemberValue(members.first.get('basePower'));
  if (category === 'Status' && basePower !== undefined && basePower !== 0) {
    diagnostics.push(
      createDiagnostic(
        rangeForMember(parsed, members.first.get('basePower')),
        "Status moves must use 'basePower: 0'.",
        vscode.DiagnosticSeverity.Error,
      ),
    );
  }

  const name = readStringMemberValue(members.first.get('name'));
  if (name) {
    const fileStem = path.basename(parsed.uri.fsPath, '.js');
    if (normalizeSlug(name) !== normalizeSlug(fileStem)) {
      diagnostics.push(
        createDiagnostic(
          rangeForMember(parsed, members.first.get('name')),
          `Move name '${name}' does not match file id '${fileStem}'.`,
          workspaceWarningSeverity(),
        ),
      );
    }
  }

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
        "Property 'flags' must be an object.",
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
          'Flag entries must use property assignments.',
          vscode.DiagnosticSeverity.Error,
        ),
      );
      continue;
    }

    const value = literalBooleanNumberNull(flagProperty.value);
    if (value !== 1) {
      diagnostics.push(
        createDiagnostic(
          rangeForMember(parsed, flagMember),
          `Flag '${key}' must use the numeric value 1.`,
          vscode.DiagnosticSeverity.Error,
        ),
      );
    }

    if (!MOVE_FLAG_SET.has(key)) {
      diagnostics.push(
        createDiagnostic(
          rangeForMemberKey(parsed, flagMember),
          `Unknown move flag '${key}'.`,
          workspaceWarningSeverity(),
        ),
      );
    }
  }

  return diagnostics;
}

function validateSecondaryProperty(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember | undefined,
): vscode.Diagnostic[] {
  if (!member) {
    return [];
  }

  const property = asPropertyMember(member);
  if (!property) {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        "Property 'secondary' must use a value.",
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  if (isNullLiteral(property.value)) {
    return [];
  }

  if (property.value.kind !== 'object') {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        "Property 'secondary' must be null or an object.",
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  const diagnostics: vscode.Diagnostic[] = [];
  const members = indexObjectMembers(property.value);

  if (!members.first.has('chance')) {
    diagnostics.push(
      createDiagnostic(
        rangeForMember(parsed, member),
        "Secondary effect objects must define 'chance'.",
        vscode.DiagnosticSeverity.Error,
      ),
    );
  } else {
    diagnostics.push(
      ...validateNumberProperty(parsed, members.first.get('chance'), {
        allowFloat: false,
        min: 1,
        max: 100,
        label: 'secondary.chance',
      }),
    );
  }

  diagnostics.push(
    ...validateOptionalStringEnumProperty(
      parsed,
      members.first.get('status'),
      MOVE_STATUS_CODE_SET,
      'secondary.status',
    ),
  );
  diagnostics.push(
    ...validateIdentifierLikeStringProperty(
      parsed,
      members.first.get('volatileStatus'),
      'secondary.volatileStatus',
    ),
  );
  diagnostics.push(
    ...validateBoostsProperty(
      parsed,
      members.first.get('boosts'),
      'secondary.boosts',
    ),
  );

  const effectCount = ['status', 'volatileStatus', 'boosts'].filter((key) =>
    members.first.has(key),
  ).length;
  if (effectCount === 0) {
    diagnostics.push(
      createDiagnostic(
        rangeForMember(parsed, member),
        'Secondary effect objects should define at least one effect besides chance.',
        vscode.DiagnosticSeverity.Error,
      ),
    );
  }

  for (const [key, group] of members.all.entries()) {
    if (key === 'chance' || key === 'status' || key === 'volatileStatus' || key === 'boosts') {
      continue;
    }
    diagnostics.push(
      createDiagnostic(
        rangeForMemberKey(parsed, group[0]),
        `Unknown secondary property '${key}'.`,
        workspaceWarningSeverity(),
      ),
    );
  }

  return diagnostics;
}

function validateBoostsProperty(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember | undefined,
  label = 'boosts',
): vscode.Diagnostic[] {
  if (!member) {
    return [];
  }

  const property = asPropertyMember(member);
  if (!property || property.value.kind !== 'object') {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        `Property '${label}' must be an object.`,
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  const diagnostics: vscode.Diagnostic[] = [];
  const members = indexObjectMembers(property.value);
  for (const [key, group] of members.all.entries()) {
    const boostMember = group[0];
    if (!MOVE_BOOST_KEY_SET.has(key)) {
      diagnostics.push(
        createDiagnostic(
          rangeForMemberKey(parsed, boostMember),
          `Unknown boost stat '${key}'.`,
          workspaceWarningSeverity(),
        ),
      );
      continue;
    }

    diagnostics.push(
      ...validateNumberProperty(parsed, boostMember, {
        allowFloat: false,
        min: -6,
        max: 6,
        disallowZero: true,
        label: `${label}.${key}`,
      }),
    );
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
        "Property 'condition' must be an object.",
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  const diagnostics: vscode.Diagnostic[] = [];
  const members = indexObjectMembers(property.value);

  diagnostics.push(
    ...validateNumberProperty(parsed, members.first.get('duration'), {
      allowFloat: false,
      min: 1,
      label: 'condition.duration',
      optional: true,
    }),
  );

  for (const [key, group] of members.all.entries()) {
    const conditionMember = group[0];
    if (MOVE_CONDITION_DECLARATIVE_KEY_SET.has(key)) {
      continue;
    }

    if (isMoveCallbackKey(key)) {
      diagnostics.push(...validateCallbackMember(parsed, conditionMember, true));
      continue;
    }

    diagnostics.push(
      createDiagnostic(
        rangeForMemberKey(parsed, conditionMember),
        `Unknown condition property '${key}'.`,
        workspaceWarningSeverity(),
      ),
    );
  }

  return diagnostics;
}

function validateSimpleObjectProperty(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember | undefined,
  label: 'zMove' | 'maxMove',
): vscode.Diagnostic[] {
  if (!member) {
    return [];
  }

  const property = asPropertyMember(member);
  if (!property || property.value.kind !== 'object') {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        `Property '${label}' must be an object.`,
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  const diagnostics: vscode.Diagnostic[] = [];
  const members = indexObjectMembers(property.value);
  diagnostics.push(
    ...validateNumberProperty(parsed, members.first.get('basePower'), {
      allowFloat: false,
      min: 1,
      label: `${label}.basePower`,
      optional: true,
    }),
  );

  for (const [key, group] of members.all.entries()) {
    if (key === 'basePower') {
      continue;
    }
    diagnostics.push(
      createDiagnostic(
        rangeForMemberKey(parsed, group[0]),
        `Unknown ${label} property '${key}'.`,
        workspaceWarningSeverity(),
      ),
    );
  }

  return diagnostics;
}

function validateCallbackMember(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember,
  allowBooleanLiteral: boolean,
): vscode.Diagnostic[] {
  if (member.kind === 'method') {
    return [];
  }

  if (member.kind !== 'property') {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        'Callback entries must use methods or function-valued properties.',
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  if (member.value.kind === 'function') {
    return [];
  }

  if (
    allowBooleanLiteral &&
    member.value.kind === 'literal' &&
    member.value.literalType === 'boolean'
  ) {
    return [];
  }

  return [
    createDiagnostic(
      rangeForMember(parsed, member),
      `Callback-like property '${member.key}' must use a function${allowBooleanLiteral ? ' or boolean literal' : ''}.`,
      vscode.DiagnosticSeverity.Error,
    ),
  ];
}

function validateAccuracyProperty(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember | undefined,
): vscode.Diagnostic[] {
  if (!member) {
    return [];
  }

  const booleanValue = readBooleanMemberValue(member);
  if (booleanValue === true) {
    return [];
  }

  return validateNumberProperty(parsed, member, {
    allowFloat: false,
    min: 1,
    max: 100,
    label: 'accuracy',
  });
}

function validateFractionProperty(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember | undefined,
  label: string,
): vscode.Diagnostic[] {
  if (!member) {
    return [];
  }

  const property = asPropertyMember(member);
  if (!property || property.value.kind !== 'array') {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        `Property '${label}' must be a [numerator, denominator] array.`,
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  if (property.value.elements.length !== 2) {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        `Property '${label}' must contain exactly two integers.`,
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  const diagnostics: vscode.Diagnostic[] = [];
  const values = property.value.elements.map(readNumericLiteralValue);
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (
      value === undefined ||
      !Number.isInteger(value) ||
      value < 1
    ) {
      diagnostics.push(
        createDiagnostic(
          rangeForJsNode(parsed, property.value.elements[i].node),
          `Property '${label}' must use positive integers.`,
          vscode.DiagnosticSeverity.Error,
        ),
      );
    }
  }

  return diagnostics;
}

function validateMultihitProperty(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember | undefined,
): vscode.Diagnostic[] {
  if (!member) {
    return [];
  }

  const property = asPropertyMember(member);
  if (!property) {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        "Property 'multihit' must use a numeric value or [min, max] array.",
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  if (property.value.kind === 'literal' && property.value.literalType === 'number') {
    const value = property.value.value as number;
    if (!Number.isInteger(value) || value < 1) {
      return [
        createDiagnostic(
          rangeForMember(parsed, member),
          "Property 'multihit' must be a positive integer.",
          vscode.DiagnosticSeverity.Error,
        ),
      ];
    }
    return [];
  }

  if (property.value.kind !== 'array' || property.value.elements.length !== 2) {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        "Property 'multihit' must be a positive integer or [min, max] array.",
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  const min = readNumericLiteralValue(property.value.elements[0]);
  const max = readNumericLiteralValue(property.value.elements[1]);
  if (
    min === undefined ||
    max === undefined ||
    !Number.isInteger(min) ||
    !Number.isInteger(max) ||
    min < 1 ||
    max < min
  ) {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        "Property 'multihit' must use positive integers where max >= min.",
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  return [];
}

function validateSelfSwitchProperty(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember | undefined,
): vscode.Diagnostic[] {
  if (!member) {
    return [];
  }

  const booleanValue = readBooleanMemberValue(member);
  if (booleanValue === true) {
    return [];
  }

  const stringValue = readStringMemberValue(member);
  if (stringValue && MOVE_SELF_SWITCH_VALUE_SET.has(stringValue)) {
    return [];
  }

  return [
    createDiagnostic(
      rangeForMember(parsed, member),
      "Property 'selfSwitch' must be true, 'copyvolatile', or 'shedtail'.",
      vscode.DiagnosticSeverity.Error,
    ),
  ];
}

function validateSelfdestructProperty(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember | undefined,
): vscode.Diagnostic[] {
  if (!member) {
    return [];
  }

  const stringValue = readStringMemberValue(member);
  if (stringValue && MOVE_SELFDESTRUCT_VALUE_SET.has(stringValue)) {
    return [];
  }

  return [
    createDiagnostic(
      rangeForMember(parsed, member),
      "Property 'selfdestruct' must be 'always' or 'ifHit'.",
      vscode.DiagnosticSeverity.Error,
    ),
  ];
}

function validateRequiredStringProperty(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember | undefined,
  label: string,
): vscode.Diagnostic[] {
  if (!member) {
    return [];
  }

  const value = readStringMemberValue(member);
  if (value && value.trim().length > 0) {
    return [];
  }

  return [
    createDiagnostic(
      rangeForMember(parsed, member),
      `Property '${label}' must be a non-empty string.`,
      vscode.DiagnosticSeverity.Error,
    ),
  ];
}

function validateOptionalStringProperty(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember | undefined,
  label: string,
): vscode.Diagnostic[] {
  if (!member) {
    return [];
  }

  const value = readStringMemberValue(member);
  if (value !== undefined && value.trim().length > 0) {
    return [];
  }

  return [
    createDiagnostic(
      rangeForMember(parsed, member),
      `Property '${label}' must be a non-empty string.`,
      vscode.DiagnosticSeverity.Error,
    ),
  ];
}

function validateIdentifierLikeStringProperty(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember | undefined,
  label: string,
): vscode.Diagnostic[] {
  if (!member) {
    return [];
  }

  const value = readStringMemberValue(member);
  if (value !== undefined && /^[a-z][a-z0-9_]*$/i.test(value)) {
    return [];
  }

  return [
    createDiagnostic(
      rangeForMember(parsed, member),
      `Property '${label}' must be an identifier-like string.`,
      vscode.DiagnosticSeverity.Error,
    ),
  ];
}

function validateOptionalBooleanProperty(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember | undefined,
  label: string,
): vscode.Diagnostic[] {
  if (!member) {
    return [];
  }

  if (readBooleanMemberValue(member) !== undefined) {
    return [];
  }

  return [
    createDiagnostic(
      rangeForMember(parsed, member),
      `Property '${label}' must be a boolean.`,
      vscode.DiagnosticSeverity.Error,
    ),
  ];
}

function validateStringEnumProperty(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember | undefined,
  values: ReadonlySet<string>,
  label: string,
): vscode.Diagnostic[] {
  if (!member) {
    return [];
  }

  const value = readStringMemberValue(member);
  if (value !== undefined && values.has(value)) {
    return [];
  }

  return [
    createDiagnostic(
      rangeForMember(parsed, member),
      `Property '${label}' must be one of the supported values.`,
      vscode.DiagnosticSeverity.Error,
    ),
  ];
}

function validateOptionalStringEnumProperty(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember | undefined,
  values: ReadonlySet<string>,
  label: string,
): vscode.Diagnostic[] {
  if (!member) {
    return [];
  }

  return validateStringEnumProperty(parsed, member, values, label);
}

function validateNumberProperty(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember | undefined,
  options: {
    label: string;
    min: number;
    max?: number;
    allowFloat: boolean;
    disallowZero?: boolean;
    optional?: boolean;
  },
): vscode.Diagnostic[] {
  if (!member) {
    return [];
  }

  const value = readNumericMemberValue(member);
  if (value === undefined) {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        `Property '${options.label}' must be a number.`,
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  if (!options.allowFloat && !Number.isInteger(value)) {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        `Property '${options.label}' must be an integer.`,
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  if (value < options.min || (options.max !== undefined && value > options.max)) {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        `Property '${options.label}' is out of range.`,
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  if (options.disallowZero && value === 0) {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        `Property '${options.label}' cannot be 0.`,
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  return [];
}

function readNumericMemberValue(member: JsObjectMember | undefined): number | undefined {
  if (!member || member.kind !== 'property') {
    return undefined;
  }
  return readNumericLiteralValue(member.value);
}

function readNumericLiteralValue(value: JsValueNode): number | undefined {
  return value.kind === 'literal' && value.literalType === 'number'
    ? (value.value as number)
    : undefined;
}

function readStringMemberValue(member: JsObjectMember | undefined): string | undefined {
  if (!member || member.kind !== 'property') {
    return undefined;
  }
  return valueAsString(member.value);
}

function valueAsString(value: JsValueNode): string | undefined {
  return value.kind === 'literal' && value.literalType === 'string'
    ? (value.value as string)
    : undefined;
}

function readBooleanMemberValue(member: JsObjectMember | undefined): boolean | undefined {
  if (!member || member.kind !== 'property') {
    return undefined;
  }
  return valueAsBoolean(member.value);
}

function valueAsBoolean(value: JsValueNode): boolean | undefined {
  return value.kind === 'literal' && value.literalType === 'boolean'
    ? (value.value as boolean)
    : undefined;
}

function literalBooleanNumberNull(
  value: JsValueNode,
): boolean | number | null | undefined {
  if (value.kind !== 'literal') {
    return undefined;
  }

  if (value.literalType === 'number') {
    return value.value as number;
  }
  if (value.literalType === 'boolean') {
    return value.value as boolean;
  }
  if (value.literalType === 'null') {
    return null;
  }
  return undefined;
}

function isNullLiteral(value: JsValueNode): boolean {
  return value.kind === 'literal' && value.literalType === 'null';
}

function asPropertyMember(
  member: JsObjectMember | undefined,
): JsPropertyMember | undefined {
  return member?.kind === 'property' ? member : undefined;
}

function indexObjectMembers(objectNode: JsObjectNode): IndexedObjectMembers {
  const all = new Map<string, JsObjectMember[]>();
  const first = new Map<string, JsObjectMember>();

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

function rangeForMember(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember | undefined,
): vscode.Range {
  if (!member) {
    return new vscode.Range(0, 0, 0, 1);
  }
  if (member.kind === 'unsupported-member') {
    return rangeForJsNode(parsed, member.node);
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
