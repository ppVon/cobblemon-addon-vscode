import {
  MOVE_BOOST_KEYS,
  MOVE_FLAG_RENDER_ORDER,
  MOVE_TEMPLATE_FIELD_ORDER,
  type MoveTemplateDefinition,
  isValidJsIdentifierKey,
} from '../../moves/spec';
import { type MoveBuilderFormData } from './types';

export function buildMoveTemplate(
  formData: MoveBuilderFormData,
): string {
  const definition = buildMoveDefinition(formData);
  const ordered = buildOrderedMoveRecord(definition);
  const objectBody = `{\n${renderObjectBody(ordered, 1)}\n}`;
  return `(${objectBody});\n`;
}

function buildMoveDefinition(formData: MoveBuilderFormData): MoveTemplateDefinition {
  const definition: MoveTemplateDefinition = {
    accuracy:
      formData.accuracyMode === 'always'
        ? true
        : Number.parseInt(formData.accuracyValue.trim(), 10),
    basePower: Number.parseInt(formData.basePower.trim(), 10),
    category: formData.category.trim() as MoveTemplateDefinition['category'],
    name: formData.moveName.trim(),
    pp: Number.parseInt(formData.pp.trim(), 10),
    priority: Number.parseInt(formData.priority.trim(), 10),
    flags: buildFlags(formData.selectedFlags),
    secondary: buildSecondary(formData),
    target: formData.target.trim() as MoveTemplateDefinition['target'],
    type: formData.type.trim() as MoveTemplateDefinition['type'],
  };

  if (formData.moveNumber.trim().length > 0) {
    definition.num = Number.parseInt(formData.moveNumber.trim(), 10);
  }

  if (formData.contestType.trim().length > 0) {
    definition.contestType = formData.contestType.trim() as MoveTemplateDefinition['contestType'];
  }

  if (formData.forceSwitch) {
    definition.forceSwitch = true;
  }
  maybeAssignFraction(definition, 'recoil', formData.recoilNumerator, formData.recoilDenominator);
  if (formData.struggleRecoil) {
    definition.struggleRecoil = true;
  }
  if (formData.mindBlownRecoil) {
    definition.mindBlownRecoil = true;
  }
  if (formData.hasCrashDamage) {
    definition.hasCrashDamage = true;
  }

  if (formData.status.trim().length > 0) {
    definition.status = formData.status.trim() as MoveTemplateDefinition['status'];
  }
  if (formData.volatileStatus.trim().length > 0) {
    definition.volatileStatus = formData.volatileStatus.trim();
  }
  if (formData.sideCondition.trim().length > 0) {
    definition.sideCondition = formData.sideCondition.trim();
  }
  if (formData.slotCondition.trim().length > 0) {
    definition.slotCondition = formData.slotCondition.trim();
  }
  if (formData.pseudoWeather.trim().length > 0) {
    definition.pseudoWeather = formData.pseudoWeather.trim();
  }
  if (formData.terrain.trim().length > 0) {
    definition.terrain = formData.terrain.trim();
  }
  if (formData.weather.trim().length > 0) {
    definition.weather = formData.weather.trim();
  }

  const boosts = buildBoosts(formData.boostStat, formData.boostStages);
  if (boosts) {
    definition.boosts = boosts;
  }

  maybeAssignFraction(definition, 'drain', formData.drainNumerator, formData.drainDenominator);
  maybeAssignFraction(definition, 'heal', formData.healNumerator, formData.healDenominator);

  if (formData.ohko) {
    definition.ohko = true;
  }
  if (formData.critRatio.trim().length > 0) {
    definition.critRatio = Number.parseInt(formData.critRatio.trim(), 10);
  }

  if (formData.multihitMode === 'fixed') {
    definition.multihit = Number.parseInt(formData.multihitValue.trim(), 10);
  } else if (formData.multihitMode === 'range') {
    definition.multihit = [
      Number.parseInt(formData.multihitMin.trim(), 10),
      Number.parseInt(formData.multihitMax.trim(), 10),
    ];
  }

  if (formData.stallingMove) {
    definition.stallingMove = true;
  }
  if (formData.selfSwitch === 'true') {
    definition.selfSwitch = true;
  } else if (formData.selfSwitch) {
    definition.selfSwitch = formData.selfSwitch;
  }
  if (formData.selfdestruct === 'true') {
    definition.selfdestruct = true;
  } else if (formData.selfdestruct) {
    definition.selfdestruct = formData.selfdestruct;
  }
  if (formData.ignoreAbility) {
    definition.ignoreAbility = true;
  }
  if (formData.ignoreImmunity) {
    definition.ignoreImmunity = true;
  }
  if (formData.ignoreDefensive) {
    definition.ignoreDefensive = true;
  }
  if (formData.ignoreEvasion) {
    definition.ignoreEvasion = true;
  }

  return definition;
}

function buildSecondary(
  formData: MoveBuilderFormData,
): MoveTemplateDefinition['secondary'] {
  const boosts = buildBoosts(
    formData.secondaryBoostStat,
    formData.secondaryBoostStages,
  );
  const hasEffect =
    formData.secondaryStatus.trim().length > 0 ||
    formData.secondaryVolatileStatus.trim().length > 0 ||
    !!boosts;

  if (!hasEffect) {
    return null;
  }

  const secondary: NonNullable<MoveTemplateDefinition['secondary']> = {
    chance: Number.parseInt(formData.secondaryChance.trim(), 10),
  };
  if (formData.secondaryStatus.trim().length > 0) {
    secondary.status = formData.secondaryStatus.trim() as NonNullable<MoveTemplateDefinition['secondary']>['status'];
  }
  if (formData.secondaryVolatileStatus.trim().length > 0) {
    secondary.volatileStatus = formData.secondaryVolatileStatus.trim();
  }
  if (boosts) {
    secondary.boosts = boosts;
  }

  return secondary;
}

function buildFlags(selectedFlags: string[]): Record<string, 1> {
  const flagSet = new Set(selectedFlags);
  const entries: Array<[string, 1]> = [];
  for (const flag of MOVE_FLAG_RENDER_ORDER) {
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

function buildBoosts(
  statRaw: string,
  stagesRaw: string,
): MoveTemplateDefinition['boosts'] | undefined {
  const stat = statRaw.trim();
  const stages = stagesRaw.trim();
  if (!stat || !stages) {
    return undefined;
  }

  return {
    [stat]: Number.parseInt(stages, 10),
  };
}

function maybeAssignFraction(
  definition: MoveTemplateDefinition,
  key: 'recoil' | 'drain' | 'heal',
  numeratorRaw: string,
  denominatorRaw: string,
): void {
  const numerator = numeratorRaw.trim();
  const denominator = denominatorRaw.trim();
  if (!numerator || !denominator) {
    return;
  }

  definition[key] = [
    Number.parseInt(numerator, 10),
    Number.parseInt(denominator, 10),
  ];
}

function buildOrderedMoveRecord(
  definition: MoveTemplateDefinition,
): Record<string, unknown> {
  const ordered: Record<string, unknown> = {};

  for (const key of MOVE_TEMPLATE_FIELD_ORDER) {
    const value = definition[key as keyof MoveTemplateDefinition];
    if (value === undefined) {
      continue;
    }

    if (key === 'flags') {
      ordered[key] = orderRecord(value as Record<string, unknown>, [
        ...MOVE_FLAG_RENDER_ORDER,
      ]);
      continue;
    }

    if (key === 'boosts') {
      ordered[key] = orderRecord(value as Record<string, unknown>, [
        ...MOVE_BOOST_KEYS,
      ]);
      continue;
    }

    if (key === 'secondary' && value && typeof value === 'object' && !Array.isArray(value)) {
      const secondary = value as Record<string, unknown>;
      ordered[key] = orderRecord(secondary, [
        'chance',
        'status',
        'volatileStatus',
        'boosts',
      ], {
        boosts: [...MOVE_BOOST_KEYS],
      });
      continue;
    }

    ordered[key] = value;
  }

  return ordered;
}

function orderRecord(
  value: Record<string, unknown>,
  preferredKeys: readonly string[],
  nestedOrders?: Record<string, readonly string[]>,
): Record<string, unknown> {
  const ordered: Record<string, unknown> = {};
  const seen = new Set<string>();

  for (const key of preferredKeys) {
    if (!(key in value)) {
      continue;
    }
    seen.add(key);
    ordered[key] = orderMaybeNested(key, value[key], nestedOrders);
  }

  for (const [key, entry] of Object.entries(value)) {
    if (seen.has(key)) {
      continue;
    }
    ordered[key] = orderMaybeNested(key, entry, nestedOrders);
  }

  return ordered;
}

function orderMaybeNested(
  key: string,
  value: unknown,
  nestedOrders?: Record<string, readonly string[]>,
): unknown {
  const nestedOrder = nestedOrders?.[key];
  if (
    nestedOrder &&
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  ) {
    return orderRecord(value as Record<string, unknown>, nestedOrder);
  }
  return value;
}

function renderObjectBody(
  value: Record<string, unknown>,
  indentLevel: number,
): string {
  return Object.entries(value)
    .map(([key, entry]) => `${indent(indentLevel)}${renderKey(key)}: ${renderValue(entry, indentLevel)},`)
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
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every((item) => item === null || typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean');
  }
  return false;
}

function indent(level: number): string {
  return '  '.repeat(level);
}
