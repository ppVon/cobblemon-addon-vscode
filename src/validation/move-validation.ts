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
  MOVE_NONSTANDARD_VALUE_SET,
  MOVE_OVERRIDE_POKEMON_VALUE_SET,
  MOVE_OVERRIDE_STAT_VALUE_SET,
  MOVE_SELFDESTRUCT_VALUE_SET,
  MOVE_SELF_SWITCH_VALUE_SET,
  MOVE_STATUS_CODE_SET,
  MOVE_TARGET_SET,
  MOVE_TOP_LEVEL_DECLARATIVE_KEY_SET,
  MOVE_TYPE_SET,
  isConditionCallbackLikeKey,
  isConditionNumericCallbackKey,
  isMoveCallbackKey,
  isMoveCallbackLikeKey,
  isMoveNumericCallbackKey,
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
        `Move parse error: ${error.message}`,
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
          `You already set '${member.key}' once in this move. Remove the extra copy.`,
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
          `This move is missing '${key}'.`,
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
    if (MOVE_TOP_LEVEL_DECLARATIVE_KEY_SET.has(key)) {
      continue;
    }

    if (isMoveCallbackKey(key)) {
      diagnostics.push(...validateMoveCallbackMember(parsed, member));
      continue;
    }

    if (isMoveCallbackLikeKey(key)) {
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
        `'${key}' is not a recognized move setting. Check the spelling.`,
        workspaceWarningSeverity(),
      ),
    );
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
    ...validateOptionalStringEnumProperty(
      parsed,
      members.first.get('isNonstandard'),
      MOVE_NONSTANDARD_VALUE_SET,
      'isNonstandard',
    ),
  );
  diagnostics.push(
    ...validateOptionalStringProperty(
      parsed,
      members.first.get('realMove'),
      'realMove',
    ),
  );
  diagnostics.push(...validateDamageProperty(parsed, members.first.get('damage')));
  diagnostics.push(
    ...validateOptionalBooleanProperty(
      parsed,
      members.first.get('noPPBoosts'),
      'noPPBoosts',
    ),
  );
  diagnostics.push(...validateBooleanOrStringProperty(parsed, members.first.get('isMax'), 'isMax'));
  diagnostics.push(
    ...validateOptionalBooleanProperty(
      parsed,
      members.first.get('forceSwitch'),
      'forceSwitch',
    ),
  );
  diagnostics.push(
    ...validateOptionalBooleanProperty(
      parsed,
      members.first.get('thawsTarget'),
      'thawsTarget',
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
    ...validateOptionalStringProperty(
      parsed,
      members.first.get('volatileStatus'),
      'volatileStatus',
    ),
  );
  diagnostics.push(
    ...validateOptionalStringProperty(
      parsed,
      members.first.get('sideCondition'),
      'sideCondition',
    ),
  );
  diagnostics.push(
    ...validateOptionalStringProperty(
      parsed,
      members.first.get('slotCondition'),
      'slotCondition',
    ),
  );
  diagnostics.push(
    ...validateOptionalStringProperty(
      parsed,
      members.first.get('pseudoWeather'),
      'pseudoWeather',
    ),
  );
  diagnostics.push(
    ...validateOptionalStringProperty(
      parsed,
      members.first.get('terrain'),
      'terrain',
    ),
  );
  diagnostics.push(
    ...validateOptionalStringProperty(
      parsed,
      members.first.get('weather'),
      'weather',
    ),
  );
  diagnostics.push(...validateBoostsProperty(parsed, members.first.get('boosts')));
  diagnostics.push(
    ...validateFractionProperty(parsed, members.first.get('drain'), 'drain'),
  );
  diagnostics.push(
    ...validateFractionProperty(parsed, members.first.get('heal'), 'heal', true),
  );
  diagnostics.push(...validateBooleanOrStringProperty(parsed, members.first.get('ohko'), 'ohko'));
  diagnostics.push(
    ...validateOptionalBooleanProperty(
      parsed,
      members.first.get('breaksProtect'),
      'breaksProtect',
    ),
  );
  diagnostics.push(
    ...validateSelfBoostProperty(parsed, members.first.get('selfBoost')),
  );
  diagnostics.push(
    ...validateOptionalBooleanProperty(
      parsed,
      members.first.get('stealsBoosts'),
      'stealsBoosts',
    ),
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
    ...validateSecondariesProperty(parsed, members.first.get('secondaries')),
  );
  diagnostics.push(...validateSelfProperty(parsed, members.first.get('self')));
  diagnostics.push(
    ...validateOptionalBooleanProperty(
      parsed,
      members.first.get('hasSheerForce'),
      'hasSheerForce',
    ),
  );
  diagnostics.push(
    ...validateOptionalBooleanProperty(
      parsed,
      members.first.get('alwaysHit'),
      'alwaysHit',
    ),
  );
  diagnostics.push(
    ...validateOptionalStringEnumProperty(
      parsed,
      members.first.get('baseMoveType'),
      MOVE_TYPE_SET,
      'baseMoveType',
    ),
  );
  diagnostics.push(
    ...validateNumberProperty(parsed, members.first.get('basePowerModifier'), {
      allowFloat: true,
      min: Number.NEGATIVE_INFINITY,
      label: 'basePowerModifier',
      optional: true,
    }),
  );
  diagnostics.push(
    ...validateNumberProperty(parsed, members.first.get('critModifier'), {
      allowFloat: true,
      min: Number.NEGATIVE_INFINITY,
      label: 'critModifier',
      optional: true,
    }),
  );
  diagnostics.push(
    ...validateOptionalBooleanProperty(
      parsed,
      members.first.get('forceSTAB'),
      'forceSTAB',
    ),
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
    ...validateBooleanOrStringProperty(parsed, members.first.get('isZ'), 'isZ'),
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
    ...validateIgnoreImmunityProperty(parsed, members.first.get('ignoreImmunity')),
  );
  diagnostics.push(
    ...validateOptionalBooleanProperty(
      parsed,
      members.first.get('ignoreAccuracy'),
      'ignoreAccuracy',
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
    ...validateOptionalBooleanProperty(
      parsed,
      members.first.get('ignoreNegativeOffensive'),
      'ignoreNegativeOffensive',
    ),
  );
  diagnostics.push(
    ...validateOptionalBooleanProperty(
      parsed,
      members.first.get('ignoreOffensive'),
      'ignoreOffensive',
    ),
  );
  diagnostics.push(
    ...validateOptionalBooleanProperty(
      parsed,
      members.first.get('ignorePositiveDefensive'),
      'ignorePositiveDefensive',
    ),
  );
  diagnostics.push(
    ...validateOptionalBooleanProperty(
      parsed,
      members.first.get('ignorePositiveEvasion'),
      'ignorePositiveEvasion',
    ),
  );
  diagnostics.push(
    ...validateOptionalBooleanProperty(
      parsed,
      members.first.get('multiaccuracy'),
      'multiaccuracy',
    ),
  );
  diagnostics.push(
    ...validateOptionalStringProperty(
      parsed,
      members.first.get('multihitType'),
      'multihitType',
    ),
  );
  diagnostics.push(
    ...validateOptionalBooleanProperty(
      parsed,
      members.first.get('noDamageVariance'),
      'noDamageVariance',
    ),
  );
  diagnostics.push(
    ...validateOptionalStringProperty(
      parsed,
      members.first.get('nonGhostTarget'),
      'nonGhostTarget',
    ),
  );
  diagnostics.push(
    ...validateOptionalStringEnumProperty(
      parsed,
      members.first.get('overrideOffensivePokemon'),
      MOVE_OVERRIDE_POKEMON_VALUE_SET,
      'overrideOffensivePokemon',
    ),
  );
  diagnostics.push(
    ...validateOptionalStringEnumProperty(
      parsed,
      members.first.get('overrideDefensivePokemon'),
      MOVE_OVERRIDE_POKEMON_VALUE_SET,
      'overrideDefensivePokemon',
    ),
  );
  diagnostics.push(
    ...validateOptionalStringEnumProperty(
      parsed,
      members.first.get('overrideOffensiveStat'),
      MOVE_OVERRIDE_STAT_VALUE_SET,
      'overrideOffensiveStat',
    ),
  );
  diagnostics.push(
    ...validateOptionalStringEnumProperty(
      parsed,
      members.first.get('overrideDefensiveStat'),
      MOVE_OVERRIDE_STAT_VALUE_SET,
      'overrideDefensiveStat',
    ),
  );
  diagnostics.push(
    ...validateOptionalStringProperty(
      parsed,
      members.first.get('pressureTarget'),
      'pressureTarget',
    ),
  );
  diagnostics.push(
    ...validateOptionalBooleanProperty(
      parsed,
      members.first.get('sleepUsable'),
      'sleepUsable',
    ),
  );
  diagnostics.push(
    ...validateNumberProperty(parsed, members.first.get('spreadModifier'), {
      allowFloat: true,
      min: Number.NEGATIVE_INFINITY,
      label: 'spreadModifier',
      optional: true,
    }),
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
    const fileStem = path.basename(parsed.uri.fsPath, path.extname(parsed.uri.fsPath));
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
        "'flags' must look like 'flags: { protect: 1, contact: 1 }'.",
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
          "Inside 'flags', only flag names like 'protect: 1' are allowed. Functions do not belong here.",
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
          `Flag '${key}' must be set to 1.`,
          vscode.DiagnosticSeverity.Error,
        ),
      );
    }

    if (!MOVE_FLAG_SET.has(key)) {
      diagnostics.push(
        createDiagnostic(
          rangeForMemberKey(parsed, flagMember),
          `'${key}' is not a recognized flag name.`,
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
        "Give 'secondary' a value like null or an object.",
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
        "'secondary' must be null or an object like 'secondary: { chance: 30, status: \"brn\" }'.",
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  return validateSecondaryEffectObject(parsed, property.value, 'secondary');
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
  if (property && isNullLiteral(property.value)) {
    return [];
  }

  if (!property || property.value.kind !== 'object') {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        `'${label}' must be an object of stat changes, like '{ atk: 1 }'.`,
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
          `'${key}' is not a recognized stat for '${label}'.`,
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

function validateSecondaryEffectObject(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  objectNode: JsObjectNode,
  label: string,
): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  const members = indexObjectMembers(objectNode);

  diagnostics.push(
    ...validateNumberProperty(parsed, members.first.get('chance'), {
      allowFloat: false,
      min: 1,
      max: 100,
      label: `${label}.chance`,
      optional: true,
    }),
  );
  diagnostics.push(...validateHitEffectMembers(parsed, members, label));
  diagnostics.push(
    ...validateOptionalBooleanProperty(
      parsed,
      members.first.get('dustproof'),
      `${label}.dustproof`,
    ),
  );
  diagnostics.push(
    ...validateOptionalBooleanProperty(
      parsed,
      members.first.get('kingsrock'),
      `${label}.kingsrock`,
    ),
  );
  diagnostics.push(
    ...validateOptionalAnyProperty(
      parsed,
      members.first.get('ability'),
      `${label}.ability`,
    ),
  );
  diagnostics.push(
    ...validateHitEffectContainerProperty(
      parsed,
      members.first.get('self'),
      `${label}.self`,
    ),
  );

  const effectCount = [
    'status',
    'volatileStatus',
    'sideCondition',
    'slotCondition',
    'pseudoWeather',
    'terrain',
    'weather',
    'boosts',
    'self',
  ].filter((key) => members.first.has(key)).length;
  if (effectCount === 0) {
    diagnostics.push(
      createDiagnostic(
        rangeForJsNode(parsed, objectNode.node),
        `${label} is empty. Add at least one effect, like status, volatileStatus, boosts, or self.`,
        vscode.DiagnosticSeverity.Error,
      ),
    );
  }

  for (const [key, group] of members.all.entries()) {
    if (
      key === 'chance' ||
      key === 'ability' ||
      key === 'dustproof' ||
      key === 'kingsrock' ||
      key === 'self' ||
      key === 'boosts' ||
      key === 'status' ||
      key === 'volatileStatus' ||
      key === 'sideCondition' ||
      key === 'slotCondition' ||
      key === 'pseudoWeather' ||
      key === 'terrain' ||
      key === 'weather'
    ) {
      continue;
    }
    diagnostics.push(
      createDiagnostic(
        rangeForMemberKey(parsed, group[0]),
        `'${key}' is not a recognized ${label} setting. Check the spelling.`,
        workspaceWarningSeverity(),
      ),
    );
  }

  return diagnostics;
}

function validateHitEffectMembers(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  members: IndexedObjectMembers,
  label: string,
): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  diagnostics.push(
    ...validateOptionalStringEnumProperty(
      parsed,
      members.first.get('status'),
      MOVE_STATUS_CODE_SET,
      `${label}.status`,
    ),
  );
  diagnostics.push(
    ...validateOptionalStringProperty(
      parsed,
      members.first.get('volatileStatus'),
      `${label}.volatileStatus`,
    ),
  );
  diagnostics.push(
    ...validateOptionalStringProperty(
      parsed,
      members.first.get('sideCondition'),
      `${label}.sideCondition`,
    ),
  );
  diagnostics.push(
    ...validateOptionalStringProperty(
      parsed,
      members.first.get('slotCondition'),
      `${label}.slotCondition`,
    ),
  );
  diagnostics.push(
    ...validateOptionalStringProperty(
      parsed,
      members.first.get('pseudoWeather'),
      `${label}.pseudoWeather`,
    ),
  );
  diagnostics.push(
    ...validateOptionalStringProperty(
      parsed,
      members.first.get('terrain'),
      `${label}.terrain`,
    ),
  );
  diagnostics.push(
    ...validateOptionalStringProperty(
      parsed,
      members.first.get('weather'),
      `${label}.weather`,
    ),
  );
  diagnostics.push(
    ...validateBoostsProperty(parsed, members.first.get('boosts'), `${label}.boosts`),
  );
  return diagnostics;
}

function validateSelfBoostProperty(
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
        "'selfBoost' must look like 'selfBoost: { boosts: { atk: 1 } }'.",
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  const diagnostics = validateBoostsProperty(
    parsed,
    indexObjectMembers(property.value).first.get('boosts'),
    'selfBoost.boosts',
  );

  for (const [key, group] of indexObjectMembers(property.value).all.entries()) {
    if (key === 'boosts') {
      continue;
    }
    diagnostics.push(
      createDiagnostic(
        rangeForMemberKey(parsed, group[0]),
        `'${key}' is not a recognized selfBoost setting. Check the spelling.`,
        workspaceWarningSeverity(),
      ),
    );
  }

  return diagnostics;
}

function validateSecondariesProperty(
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
        "'secondaries' must be null or a list like '[{ chance: 30, status: \"brn\" }]'.",
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  if (isNullLiteral(property.value)) {
    return [];
  }

  if (property.value.kind !== 'array') {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        "'secondaries' must be null or a list like '[{ chance: 30, status: \"brn\" }]'.",
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  const diagnostics: vscode.Diagnostic[] = [];
  property.value.elements.forEach((element, index) => {
    if (element.kind !== 'object') {
      diagnostics.push(
        createDiagnostic(
          rangeForJsNode(parsed, element.node),
          `Each entry in 'secondaries' must be an object. Problem found at secondaries[${index}].`,
          vscode.DiagnosticSeverity.Error,
        ),
      );
      return;
    }

    diagnostics.push(
      ...validateSecondaryEffectObject(parsed, element, `secondaries[${index}]`),
    );
  });
  return diagnostics;
}

function validateSelfProperty(
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
        "'self' must be null or an object like 'self: { boosts: { atk: 1 } }'.",
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
        "'self' must be null or an object like 'self: { boosts: { atk: 1 } }'.",
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  return validateSecondaryEffectObject(parsed, property.value, 'self');
}

function validateHitEffectContainerProperty(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember | undefined,
  label: string,
): vscode.Diagnostic[] {
  if (!member) {
    return [];
  }

  const property = asPropertyMember(member);
  if (!property || property.value.kind !== 'object') {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        `'${label}' must be an object.`,
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  const diagnostics = validateHitEffectMembers(
    parsed,
    indexObjectMembers(property.value),
    label,
  );

  for (const [key, group] of indexObjectMembers(property.value).all.entries()) {
    if (
      key === 'boosts' ||
      key === 'status' ||
      key === 'volatileStatus' ||
      key === 'sideCondition' ||
      key === 'slotCondition' ||
      key === 'pseudoWeather' ||
      key === 'terrain' ||
      key === 'weather'
    ) {
      continue;
    }
    diagnostics.push(
      createDiagnostic(
        rangeForMemberKey(parsed, group[0]),
        `'${key}' is not a recognized ${label} setting. Check the spelling.`,
        workspaceWarningSeverity(),
      ),
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
        "'condition' must be an object like 'condition: { duration: 2, onStart() {} }'.",
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

    if (isConditionCallbackLikeKey(key)) {
      diagnostics.push(...validateConditionCallbackMember(parsed, conditionMember));
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
        `'${label}' must be an object.`,
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  const diagnostics: vscode.Diagnostic[] = [];
  const members = indexObjectMembers(property.value);
  if (label === 'maxMove' && !members.first.has('basePower')) {
    diagnostics.push(
      createDiagnostic(
        rangeForMember(parsed, member),
        "Property 'maxMove' must define 'basePower'.",
        vscode.DiagnosticSeverity.Error,
      ),
    );
  }
  diagnostics.push(
    ...validateNumberProperty(parsed, members.first.get('basePower'), {
      allowFloat: false,
      min: 1,
      label: `${label}.basePower`,
      optional: true,
    }),
  );

  if (label === 'zMove') {
    diagnostics.push(
      ...validateOptionalStringProperty(
        parsed,
        members.first.get('effect'),
        'zMove.effect',
      ),
    );
    diagnostics.push(
      ...validateBoostsProperty(parsed, members.first.get('boost'), 'zMove.boost'),
    );
  }

  for (const [key, group] of members.all.entries()) {
    if (
      key === 'basePower' ||
      (label === 'zMove' && (key === 'effect' || key === 'boost'))
    ) {
      continue;
    }
    diagnostics.push(
      createDiagnostic(
        rangeForMemberKey(parsed, group[0]),
        `'${key}' is not a recognized ${label} setting. Check the spelling.`,
        workspaceWarningSeverity(),
      ),
    );
  }

  return diagnostics;
}

function validateMoveCallbackMember(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember,
): vscode.Diagnostic[] {
  if (member.kind === 'unsupported-member') {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        "This callback entry is not written in a valid way. Use a normal callback name like 'onHit(...) {}'.",
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  if (isMoveNumericCallbackKey(member.key)) {
    if (member.kind === 'method') {
      return [
        createDiagnostic(
          rangeForMember(parsed, member),
          `'${member.key}' must be a number here, not a function.`,
          vscode.DiagnosticSeverity.Error,
        ),
      ];
    }

    return validateNumberProperty(parsed, member, {
      allowFloat: true,
      min: Number.NEGATIVE_INFINITY,
      label: member.key,
    });
  }

  return validateFunctionCallbackMember(parsed, member);
}

function validateFunctionCallbackMember(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember,
): vscode.Diagnostic[] {
  if (member.kind === 'method') {
    return [];
  }

  if (member.kind !== 'property') {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        "Callbacks must be written as functions, like 'onHit(...) {}' or 'onHit: function (...) {}'.",
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  if (member.value.kind === 'function') {
    return [];
  }

  return [
    createDiagnostic(
      rangeForMember(parsed, member),
      `'${member.key}' must be a function.`,
      vscode.DiagnosticSeverity.Error,
    ),
  ];
}

function validateLooseCallbackLikeMember(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember,
): vscode.Diagnostic[] {
  if (member.kind === 'unsupported-member') {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        "This callback entry is not written in a valid way. Use a normal callback name like 'onHit(...) {}'.",
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  if (member.kind === 'method') {
    return [];
  }

  if (member.kind !== 'property') {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        "This callback-like setting must be written as a normal property or function.",
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  if (member.value.kind === 'function') {
    return [];
  }

  if (
    member.value.kind === 'literal' &&
    (
      member.value.literalType === 'boolean' ||
      member.value.literalType === 'number' ||
      member.value.literalType === 'string'
    )
  ) {
    return [];
  }

  return [
    createDiagnostic(
      rangeForMember(parsed, member),
      `'${member.key}' must be a function, string, number, or true/false value.`,
      vscode.DiagnosticSeverity.Error,
    ),
  ];
}

function validateConditionCallbackMember(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember,
): vscode.Diagnostic[] {
  if (member.kind === 'unsupported-member') {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        "This condition callback is not written in a valid way. Use a normal callback name like 'onStart() {}'.",
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  if (member.kind === 'method') {
    return [];
  }

  if (member.kind !== 'property') {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        "Condition callbacks must be written as functions or normal value properties.",
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  if (member.value.kind === 'function') {
    return [];
  }

  if (member.value.kind === 'literal') {
    if (
      member.value.literalType === 'boolean' ||
      member.value.literalType === 'string'
    ) {
      return [];
    }

    if (
      member.value.literalType === 'number' &&
      isConditionNumericCallbackKey(member.key)
    ) {
      return [];
    }
  }

  return [
    createDiagnostic(
      rangeForMember(parsed, member),
      `'${member.key}' must be a function, or a true/false, text, or number value when that setting allows it.`,
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
  allowNull = false,
): vscode.Diagnostic[] {
  if (!member) {
    return [];
  }

  const property = asPropertyMember(member);
  if (property && allowNull && isNullLiteral(property.value)) {
    return [];
  }

  if (!property || property.value.kind !== 'array') {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        `'${label}' must be two positive whole numbers in brackets, like [1, 2]${allowNull ? ' or null' : ''}.`,
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  if (property.value.elements.length !== 2) {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        `'${label}' must have exactly two numbers, like [1, 2].`,
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
          `Each number in '${label}' must be a positive whole number.`,
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
        "'multihit' must be a positive whole number or a range like [2, 5].",
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
          "'multihit' must be a positive whole number.",
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
        "'multihit' must be a positive whole number or a range like [2, 5].",
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
        "In 'multihit: [min, max]', both numbers must be positive whole numbers and max must be at least min.",
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

  const booleanValue = readBooleanMemberValue(member);
  if (booleanValue !== undefined) {
    return [];
  }

  const stringValue = readStringMemberValue(member);
  if (stringValue && MOVE_SELFDESTRUCT_VALUE_SET.has(stringValue)) {
    return [];
  }

  return [
    createDiagnostic(
      rangeForMember(parsed, member),
      "Property 'selfdestruct' must be true, 'always', or 'ifHit'.",
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
      `'${label}' must be text and cannot be empty.`,
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
      `'${label}' must be text and cannot be empty.`,
      vscode.DiagnosticSeverity.Error,
    ),
  ];
}

function validateBooleanOrStringProperty(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember | undefined,
  label: string,
): vscode.Diagnostic[] {
  if (!member) {
    return [];
  }

  if (
    readBooleanMemberValue(member) !== undefined ||
    readStringMemberValue(member)?.trim().length
  ) {
    return [];
  }

  return [
    createDiagnostic(
      rangeForMember(parsed, member),
      `'${label}' must be true/false or text.`,
      vscode.DiagnosticSeverity.Error,
    ),
  ];
}

function validateDamageProperty(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember | undefined,
): vscode.Diagnostic[] {
  if (!member) {
    return [];
  }

  const numericValue = readNumericMemberValue(member);
  if (numericValue !== undefined) {
    if (!Number.isInteger(numericValue) || numericValue < 0) {
      return [
        createDiagnostic(
          rangeForMember(parsed, member),
          "Property 'damage' must be a non-negative integer, 'level', false, or null.",
          vscode.DiagnosticSeverity.Error,
        ),
      ];
    }
    return [];
  }

  const stringValue = readStringMemberValue(member);
  if (stringValue === 'level') {
    return [];
  }

  if (readBooleanMemberValue(member) === false) {
    return [];
  }

  const property = asPropertyMember(member);
  if (property && isNullLiteral(property.value)) {
    return [];
  }

  return [
    createDiagnostic(
      rangeForMember(parsed, member),
      "Property 'damage' must be a non-negative integer, 'level', false, or null.",
      vscode.DiagnosticSeverity.Error,
    ),
  ];
}

function validateOptionalAnyProperty(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember | undefined,
  label: string,
): vscode.Diagnostic[] {
  if (!member) {
    return [];
  }

  if (member.kind === 'property') {
    return [];
  }

  return [
    createDiagnostic(
      rangeForMember(parsed, member),
      `'${label}' needs a value.`,
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
      `'${label}' should use a simple id with letters, numbers, or underscores.`,
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
      `'${label}' must be true or false.`,
      vscode.DiagnosticSeverity.Error,
    ),
  ];
}

function validateIgnoreImmunityProperty(
  parsed: Awaited<ReturnType<typeof parseWorkspaceJsObject>>,
  member: JsObjectMember | undefined,
): vscode.Diagnostic[] {
  if (!member) {
    return [];
  }

  if (readBooleanMemberValue(member) !== undefined) {
    return [];
  }

  const property = asPropertyMember(member);
  if (!property || property.value.kind !== 'object') {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        "'ignoreImmunity' must be true/false or an object like '{ Fire: true }'.",
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  const diagnostics: vscode.Diagnostic[] = [];
  for (const entry of property.value.members) {
    if (entry.kind !== 'property') {
      diagnostics.push(
        createDiagnostic(
          rangeForMember(parsed, entry),
          "Inside 'ignoreImmunity', use type names with true/false values, like 'Fire: true'.",
          vscode.DiagnosticSeverity.Error,
        ),
      );
      continue;
    }

    if (readBooleanMemberValue(entry) === undefined) {
      diagnostics.push(
        createDiagnostic(
          rangeForMember(parsed, entry),
          "Each 'ignoreImmunity' entry must be true or false.",
          vscode.DiagnosticSeverity.Error,
        ),
      );
    }
  }

  return diagnostics;
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
      `'${label}' must use one of the allowed values.`,
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
        `'${options.label}' must be a number.`,
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

  if (value < options.min || (options.max !== undefined && value > options.max)) {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        numberRangeMessage(options.label, options.min, options.max),
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  if (options.disallowZero && value === 0) {
    return [
      createDiagnostic(
        rangeForMember(parsed, member),
        `'${options.label}' cannot be 0 here.`,
        vscode.DiagnosticSeverity.Error,
      ),
    ];
  }

  return [];
}

function numberRangeMessage(
  label: string,
  min: number,
  max: number | undefined,
): string {
  if (max !== undefined && Number.isFinite(min)) {
    return `'${label}' must be between ${min} and ${max}.`;
  }
  if (Number.isFinite(min)) {
    return `'${label}' must be at least ${min}.`;
  }
  if (max !== undefined) {
    return `'${label}' must be at most ${max}.`;
  }
  return `'${label}' is out of range.`;
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
