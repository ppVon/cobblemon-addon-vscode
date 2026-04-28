import {
  ABILITY_CALLBACK_KEYS,
  ABILITY_CONDITION_CALLBACK_KEYS,
  ABILITY_CONDITION_DECLARATIVE_KEYS,
  ABILITY_FLAG_KEYS,
  ABILITY_NONSTANDARD_VALUES,
  ABILITY_NUMERIC_CALLBACK_KEY_SET,
  ABILITY_TOP_LEVEL_DECLARATIVE_KEYS,
} from './spec';

export interface CallbackSnippetDefinition {
  readonly key: string;
  readonly detail: string;
  readonly documentation?: string;
  readonly parameters?: readonly string[];
  readonly numericPlaceholder?: string;
}

const ABILITY_CALLBACK_DETAILS: Readonly<
  Record<
    typeof ABILITY_CALLBACK_KEYS[number],
    Omit<CallbackSnippetDefinition, 'key'>
  >
> = {
  onStart: {
    detail: 'Run when the ability activates',
    parameters: ['pokemon'],
  },
  onPreStart: {
    detail: 'Run before start messaging resolves',
    parameters: ['pokemon'],
  },
  onEnd: {
    detail: 'Run when the ability effect ends',
    parameters: ['pokemon'],
  },
  onSwitchIn: {
    detail: 'Run when the Pokemon switches in',
    parameters: ['pokemon'],
  },
  onSwitchOut: {
    detail: 'Run when the Pokemon switches out',
    parameters: ['pokemon'],
  },
  onResidual: {
    detail: 'Run during residual processing',
    parameters: ['pokemon'],
  },
  onResidualOrder: {
    detail: 'Set residual order',
    numericPlaceholder: '28',
  },
  onResidualPriority: {
    detail: 'Set residual priority',
    numericPlaceholder: '0',
  },
  onResidualSubOrder: {
    detail: 'Set residual sub-order',
    numericPlaceholder: '0',
  },
  onBasePowerPriority: {
    detail: 'Set base power event priority',
    numericPlaceholder: '20',
  },
  onBasePower: {
    detail: 'Modify base power',
    parameters: ['basePower', 'attacker', 'defender', 'move'],
  },
  onModifyAtk: {
    detail: 'Modify Attack',
    parameters: ['atk', 'attacker', 'defender', 'move'],
  },
  onModifyDef: {
    detail: 'Modify Defense',
    parameters: ['def', 'pokemon'],
  },
  onModifySpA: {
    detail: 'Modify Special Attack',
    parameters: ['spa', 'attacker', 'defender', 'move'],
  },
  onModifySpD: {
    detail: 'Modify Special Defense',
    parameters: ['spd', 'pokemon'],
  },
  onModifySpe: {
    detail: 'Modify Speed',
    parameters: ['spe', 'pokemon'],
  },
  onModifySTABPriority: {
    detail: 'Set STAB event priority',
    numericPlaceholder: '10',
  },
  onModifySTAB: {
    detail: 'Modify STAB multiplier',
    parameters: ['stab', 'source', 'target', 'move'],
  },
  onModifyBoost: {
    detail: 'Modify incoming stat boosts',
    parameters: ['boosts', 'pokemon'],
  },
  onModifyMove: {
    detail: 'Modify move data before use',
    parameters: ['move', 'pokemon'],
  },
  onModifyPriority: {
    detail: 'Modify action priority',
    parameters: ['priority', 'pokemon', 'target', 'move'],
  },
  onModifyTypePriority: {
    detail: 'Set move type event priority',
    numericPlaceholder: '1',
  },
  onModifyType: {
    detail: 'Modify move type',
    parameters: ['move', 'pokemon'],
  },
  onDamage: {
    detail: 'Modify incoming damage',
    parameters: ['damage', 'target', 'source', 'effect'],
  },
  onDamagingHitOrder: {
    detail: 'Set damaging-hit order',
    numericPlaceholder: '1',
  },
  onDamagingHit: {
    detail: 'Run after taking a damaging hit',
    parameters: ['damage', 'target', 'source', 'move'],
  },
  onAfterMove: {
    detail: 'Run after a move resolves',
    parameters: ['target', 'source', 'move'],
  },
  onAfterMoveSecondary: {
    detail: 'Run after secondary effects resolve',
    parameters: ['target', 'source', 'move'],
  },
  onTryHit: {
    detail: 'Run before the Pokemon is hit',
    parameters: ['target', 'source', 'move'],
  },
  onTryMove: {
    detail: 'Run before a move is used',
    parameters: ['target', 'source', 'move'],
  },
  onHit: {
    detail: 'Run when a move hits this Pokemon',
    parameters: ['target', 'source', 'move'],
  },
  onImmunity: {
    detail: 'Override a type immunity check',
    parameters: ['type', 'pokemon'],
  },
  onFoeBasePower: {
    detail: 'Modify foe base power',
    parameters: ['basePower', 'attacker', 'defender', 'move'],
  },
  onAllyBasePower: {
    detail: 'Modify ally base power',
    parameters: ['basePower', 'attacker', 'defender', 'move'],
  },
  onAnyBasePower: {
    detail: 'Modify any base power event',
    parameters: ['basePower', 'source', 'target', 'move'],
  },
  onWeatherModifyDamage: {
    detail: 'Modify weather-based damage',
    parameters: ['damage', 'attacker', 'defender', 'move'],
  },
  onSourceModifyDamage: {
    detail: 'Modify damage dealt by this Pokemon as the source',
    parameters: ['damage', 'source', 'target', 'move'],
  },
};

const ABILITY_CONDITION_CALLBACK_DETAILS: Readonly<
  Record<
    typeof ABILITY_CONDITION_CALLBACK_KEYS[number],
    Omit<CallbackSnippetDefinition, 'key'>
  >
> = {
  onStart: {
    detail: 'Run when the condition starts',
    parameters: ['target', 'source', 'effect'],
  },
  onEnd: {
    detail: 'Run when the condition ends',
    parameters: ['target'],
  },
  onResidual: {
    detail: 'Run during residual processing',
    parameters: ['target', 'source', 'effect'],
  },
  onResidualOrder: {
    detail: 'Set residual order',
    numericPlaceholder: '28',
  },
  onResidualPriority: {
    detail: 'Set residual priority',
    numericPlaceholder: '0',
  },
  onResidualSubOrder: {
    detail: 'Set residual sub-order',
    numericPlaceholder: '0',
  },
  onRestart: {
    detail: 'Run when the condition is applied again',
    parameters: ['target', 'source', 'effect'],
  },
  onTryMove: {
    detail: 'Run before the affected Pokemon moves',
    parameters: ['target', 'source', 'move'],
  },
  onDisableMove: {
    detail: 'Disable move choices while the condition is active',
    parameters: ['pokemon'],
  },
};

export const ABILITY_CALLBACK_SNIPPETS: readonly CallbackSnippetDefinition[] =
  ABILITY_CALLBACK_KEYS.map((key) => ({
    key,
    ...ABILITY_CALLBACK_DETAILS[key],
  }));

export const ABILITY_CONDITION_CALLBACK_SNIPPETS: readonly CallbackSnippetDefinition[] =
  ABILITY_CONDITION_CALLBACK_KEYS.map((key) => ({
    key,
    ...ABILITY_CONDITION_CALLBACK_DETAILS[key],
  }));

export function buildCallbackMemberSnippet(
  definition: CallbackSnippetDefinition,
): string {
  if (definition.numericPlaceholder) {
    return `${definition.key}: \${1:${definition.numericPlaceholder}},`;
  }

  const parameters = definition.parameters?.join(', ') ?? '';
  return `${definition.key}(${parameters}) {\n\t$0\n},`;
}

export function buildTopLevelAbilityPropertySnippet(key: string): string {
  switch (key) {
    case 'name':
      return 'name: "${1:My Ability}",';
    case 'num':
      return 'num: ${1:1000},';
    case 'rating':
      return 'rating: ${1:2},';
    case 'flags':
      return 'flags: {\n\t$0\n},';
    case 'suppressWeather':
      return 'suppressWeather: true,';
    case 'isNonstandard':
      return `isNonstandard: '${snippetChoice(ABILITY_NONSTANDARD_VALUES)}',`;
    case 'condition':
      return 'condition: {\n\t$0\n},';
    default:
      return `${key}: \${1:null},`;
  }
}

export function buildNestedAbilityPropertySnippet(
  context: 'flags' | 'condition',
  key: string,
): string {
  if (context === 'flags') {
    return `${key}: 1,`;
  }

  if (key === 'duration') {
    return 'duration: ${1:2},';
  }

  return `${key}: \${1:null},`;
}

export const TOP_LEVEL_ABILITY_COMPLETION_KEYS = [
  ...ABILITY_TOP_LEVEL_DECLARATIVE_KEYS,
] as const;
export const ABILITY_CONDITION_COMPLETION_KEYS = [
  ...ABILITY_CONDITION_DECLARATIVE_KEYS,
] as const;
export const ABILITY_FLAGS_COMPLETION_KEYS = [...ABILITY_FLAG_KEYS] as const;

function snippetChoice(values: readonly string[], placeholder = 1): string {
  return `\${${placeholder}|${values.map(escapeSnippetChoice).join(',')}|}`;
}

function escapeSnippetChoice(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/,/g, '\\,');
}
