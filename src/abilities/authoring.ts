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
  onAfterBoost: {
    detail: 'Run after this Pokemon receives stat boosts',
    parameters: ['boost', 'target', 'source', 'effect'],
  },
  onAfterEachBoost: {
    detail: 'Run after each individual stat boost is applied to this Pokemon',
    parameters: ['boost', 'target', 'source', 'effect'],
  },
  onSourceModifyAtk: {
    detail: 'Modify Attack of the source Pokemon',
    parameters: ['atk', 'attacker', 'defender', 'move'],
  },
  onSourceModifyAtkPriority: {
    detail: 'Set source Attack modifier event priority',
    numericPlaceholder: '5',
  },
  onSourceModifyDef: {
    detail: 'Modify Defense of the source Pokemon',
    parameters: ['def', 'pokemon'],
  },
  onSourceModifyDefPriority: {
    detail: 'Set source Defense modifier event priority',
    numericPlaceholder: '5',
  },
  onSourceModifySpA: {
    detail: 'Modify Special Attack of the source Pokemon',
    parameters: ['spa', 'attacker', 'defender', 'move'],
  },
  onSourceModifySpAPriority: {
    detail: 'Set source Special Attack modifier event priority',
    numericPlaceholder: '5',
  },
  onSourceModifySpD: {
    detail: 'Modify Special Defense of the source Pokemon',
    parameters: ['spd', 'pokemon'],
  },
  onSourceModifySpDPriority: {
    detail: 'Set source Special Defense modifier event priority',
    numericPlaceholder: '5',
  },
  onSourceModifySpe: {
    detail: 'Modify Speed of the source Pokemon',
    parameters: ['spe', 'pokemon'],
  },
  onSourceModifySpePriority: {
    detail: 'Set source Speed modifier event priority',
    numericPlaceholder: '5',
  },
  onSourceModifyHP: {
    detail: 'Modify HP of the source Pokemon',
    parameters: ['hp', 'pokemon'],
  },
  onSourceModifyHPPriority: {
    detail: 'Set source HP modifier event priority',
    numericPlaceholder: '5',
  },
  onAfterMoveSecondarySelf: {
    detail: 'Run after secondary effects resolve for the attacker',
    parameters: ['source', 'target', 'move'],
  },
  onAfterSetStatus: {
    detail: 'Run after a status condition is set on this Pokemon',
    parameters: ['status', 'target', 'source', 'effect'],
  },
  onAfterTerastallization: {
    detail: 'Run after this Pokemon Terastallizes',
    parameters: ['pokemon'],
  },
  onAfterUseItem: {
    detail: 'Run after this Pokemon uses an item',
    parameters: ['item', 'pokemon'],
  },
  onAllyAfterUseItem: {
    detail: 'Run after an ally uses an item',
    parameters: ['item', 'pokemon'],
  },
  onAllyFaint: {
    detail: 'Run when an ally faints',
    parameters: ['target'],
  },
  onAllyModifyAtk: {
    detail: 'Modify an ally\'s Attack stat',
    parameters: ['atk', 'pokemon'],
  },
  onAllyModifySpD: {
    detail: 'Modify an ally\'s Special Defense stat',
    parameters: ['spd', 'pokemon'],
  },
  onAllySetStatus: {
    detail: 'Run when a status condition is set on an ally',
    parameters: ['status', 'target', 'source', 'effect'],
  },
  onAllySideConditionStart: {
    detail: 'Run when a side condition starts on this side',
    parameters: ['target', 'source', 'sideCondition'],
  },
  onAllySwitchIn: {
    detail: 'Run when an ally switches in',
    parameters: ['pokemon'],
  },
  onAllyTryAddVolatile: {
    detail: 'Run when a volatile status is about to be added to an ally',
    parameters: ['status', 'target', 'source', 'effect'],
  },
  onAllyTryBoost: {
    detail: 'Run when an ally\'s stats are about to be boosted',
    parameters: ['boost', 'target', 'source', 'effect'],
  },
  onAllyTryHitSide: {
    detail: 'Run when a side-targeting move is about to hit the ally\'s side',
    parameters: ['target', 'source', 'move'],
  },
  onAnyAccuracy: {
    detail: 'Modify accuracy for any move in the battle',
    parameters: ['accuracy', 'target', 'source', 'move'],
  },
  onAnyAfterMove: {
    detail: 'Run after any move resolves in the battle',
  },
  onAnyAfterSetStatus: {
    detail: 'Run after any status condition is set in the battle',
    parameters: ['status', 'target', 'source', 'effect'],
  },
  onAnyDamage: {
    detail: 'Modify any damage dealt in the battle',
    parameters: ['damage', 'target', 'source', 'effect'],
  },
  onAnyFaint: {
    detail: 'Run when any Pokemon faints',
  },
  onAnyInvulnerability: {
    detail: 'Run when any Pokemon is invulnerable to a move',
    parameters: ['target', 'source', 'move'],
  },
  onAnyModifyAccuracy: {
    detail: 'Modify accuracy for any move in the battle',
    parameters: ['accuracy', 'target', 'source'],
  },
  onAnyModifyAtk: {
    detail: 'Modify any Pokemon\'s Attack stat',
    parameters: ['atk', 'source', 'target', 'move'],
  },
  onAnyModifyBoost: {
    detail: 'Modify any incoming stat boosts in the battle',
    parameters: ['boosts', 'pokemon'],
  },
  onAnyModifyDamage: {
    detail: 'Modify any damage dealt in the battle',
    parameters: ['damage', 'source', 'target', 'move'],
  },
  onAnyModifyDef: {
    detail: 'Modify any Pokemon\'s Defense stat',
    parameters: ['def', 'target', 'source', 'move'],
  },
  onAnyModifySpA: {
    detail: 'Modify any Pokemon\'s Special Attack stat',
    parameters: ['spa', 'source', 'target', 'move'],
  },
  onAnyModifySpD: {
    detail: 'Modify any Pokemon\'s Special Defense stat',
    parameters: ['spd', 'target', 'source', 'move'],
  },
  onAnyRedirectTarget: {
    detail: 'Redirect any move to a different target',
    parameters: ['target', 'source', 'source2', 'move'],
  },
  onAnySetWeather: {
    detail: 'Run when weather is set anywhere in the battle',
    parameters: ['target', 'source', 'weather'],
  },
  onAnyTryMove: {
    detail: 'Run before any move is used in the battle',
    parameters: ['target', 'source', 'effect'],
  },
  onAnyTryPrimaryHit: {
    detail: 'Run before a primary hit lands on any target',
    parameters: ['target', 'source', 'move'],
  },
  onBeforeMove: {
    detail: 'Run before this Pokemon uses a move',
    parameters: ['pokemon', 'target', 'move'],
  },
  onBeforeSwitchIn: {
    detail: 'Run before this Pokemon switches in',
    parameters: ['pokemon'],
  },
  onChangeBoost: {
    detail: 'Run when a stat boost change is applied to this Pokemon',
    parameters: ['boost', 'target', 'source', 'effect'],
  },
  onCheckShow: {
    detail: 'Determine whether this Pokemon\'s species is revealed',
    parameters: ['pokemon'],
  },
  onCriticalHit: {
    detail: 'Run when a critical hit lands on this Pokemon',
    parameters: ['target', 'source', 'move'],
  },
  onDeductPP: {
    detail: 'Run when PP is deducted from a move',
    parameters: ['target', 'source'],
  },
  onDisableMove: {
    detail: 'Disable moves for this Pokemon each turn',
    parameters: ['pokemon'],
  },
  onDragOut: {
    detail: 'Run when this Pokemon is being dragged out',
    parameters: ['pokemon'],
  },
  onEatItem: {
    detail: 'Run when this Pokemon eats a berry or item',
    parameters: ['item', 'pokemon'],
  },
  onEffectiveness: {
    detail: 'Modify type effectiveness against this Pokemon',
    parameters: ['typeMod', 'target', 'type', 'move'],
  },
  onEmergencyExit: {
    detail: 'Run when Emergency Exit triggers for this Pokemon',
    parameters: ['target'],
  },
  onFaint: {
    detail: 'Run when this Pokemon faints',
    parameters: ['pokemon'],
  },
  onFlinch: {
    detail: 'Run when this Pokemon flinches',
    parameters: ['pokemon'],
  },
  onFoeAfterBoost: {
    detail: 'Run after a foe receives stat boosts',
    parameters: ['boost', 'target', 'source', 'effect'],
  },
  onFoeMaybeTrapPokemon: {
    detail: 'Run when a foe might trap this Pokemon',
    parameters: ['pokemon', 'source'],
  },
  onFoeTrapPokemon: {
    detail: 'Run when a foe traps this Pokemon',
    parameters: ['pokemon'],
  },
  onFoeTryEatItem: {
    detail: 'Run when a foe tries to eat an item',
  },
  onFoeTryMove: {
    detail: 'Run before a foe uses a move',
    parameters: ['target', 'source', 'move'],
  },
  onFractionalPriority: {
    detail: 'Modify action priority with a fractional value',
    parameters: ['priority', 'pokemon', 'target', 'move'],
  },
  onModifyAccuracy: {
    detail: 'Modify move accuracy',
    parameters: ['accuracy', 'target', 'source', 'move'],
  },
  onModifyCritRatio: {
    detail: 'Modify critical hit ratio',
    parameters: ['critRatio', 'source', 'target'],
  },
  onModifyDamage: {
    detail: 'Modify final damage dealt',
    parameters: ['damage', 'source', 'target', 'move'],
  },
  onModifySecondaries: {
    detail: 'Modify secondary effects of a move',
    parameters: ['secondaries'],
  },
  onModifyWeight: {
    detail: 'Modify this Pokemon\'s weight',
    parameters: ['weighthg'],
  },
  onPrepareHit: {
    detail: 'Run when a move is about to hit',
    parameters: ['source', 'target', 'move'],
  },
  onRestart: {
    detail: 'Run when the ability is reapplied while already active',
  },
  onSetStatus: {
    detail: 'Run when a status condition is about to be set on this Pokemon',
    parameters: ['status', 'target', 'source', 'effect'],
  },
  onSourceAfterFaint: {
    detail: 'Run after this Pokemon KOs a target',
    parameters: ['length', 'target', 'source', 'effect'],
  },
  onSourceBasePower: {
    detail: 'Modify base power of moves used by this Pokemon as the source',
    parameters: ['basePower', 'attacker', 'defender', 'move'],
  },
  onSourceDamagingHit: {
    detail: 'Run after this Pokemon lands a damaging hit',
    parameters: ['damage', 'target', 'source', 'move'],
  },
  onSourceModifyAccuracy: {
    detail: 'Modify accuracy of moves used by this Pokemon as the source',
    parameters: ['accuracy', 'target', 'source', 'move'],
  },
  onSourceModifySecondaries: {
    detail: 'Modify secondary effects of moves used by this Pokemon as the source',
    parameters: ['secondaries', 'target', 'source', 'move'],
  },
  onSourceTryHeal: {
    detail: 'Run when this Pokemon as the source tries to heal a target',
    parameters: ['damage', 'target', 'source', 'effect'],
  },
  onSourceTryPrimaryHit: {
    detail: 'Run before a primary hit from this Pokemon as the source lands',
    parameters: ['target', 'source', 'effect'],
  },
  onTakeItem: {
    detail: 'Run when this Pokemon\'s item is taken',
    parameters: ['item', 'pokemon', 'source'],
  },
  onTerrainChange: {
    detail: 'Run when terrain changes',
    parameters: ['pokemon'],
  },
  onTryAddVolatile: {
    detail: 'Run when a volatile status is about to be added to this Pokemon',
    parameters: ['status', 'target', 'source', 'effect'],
  },
  onTryBoost: {
    detail: 'Run when this Pokemon\'s stats are about to be boosted',
    parameters: ['boost', 'target', 'source', 'effect'],
  },
  onTryEatItem: {
    detail: 'Run when this Pokemon tries to eat an item',
    parameters: ['item', 'pokemon'],
  },
  onTryHeal: {
    detail: 'Run when this Pokemon tries to heal',
    parameters: ['damage', 'target', 'source', 'effect'],
  },
  onUpdate: {
    detail: 'Run at the end of each turn for this Pokemon',
    parameters: ['pokemon'],
  },
  onWeather: {
    detail: 'Run during weather residual for this Pokemon',
    parameters: ['target', 'source', 'effect'],
  },
  onWeatherChange: {
    detail: 'Run when weather changes',
    parameters: ['pokemon'],
  },
  onAllyBasePowerPriority: {
    detail: 'Set ally base power event priority',
    numericPlaceholder: '22',
  },
  onAllyModifyAtkPriority: {
    detail: 'Set ally Attack modifier event priority',
    numericPlaceholder: '5',
  },
  onAllyModifySpDPriority: {
    detail: 'Set ally Special Defense modifier event priority',
    numericPlaceholder: '5',
  },
  onAnyBasePowerPriority: {
    detail: 'Set any base power event priority',
    numericPlaceholder: '22',
  },
  onAnyFaintPriority: {
    detail: 'Set any faint event priority',
    numericPlaceholder: '0',
  },
  onAnyInvulnerabilityPriority: {
    detail: 'Set any invulnerability event priority',
    numericPlaceholder: '0',
  },
  onAnyModifyAccuracyPriority: {
    detail: 'Set any accuracy modifier event priority',
    numericPlaceholder: '0',
  },
  onBeforeMovePriority: {
    detail: 'Set before-move event priority',
    numericPlaceholder: '0',
  },
  onDamagePriority: {
    detail: 'Set damage event priority',
    numericPlaceholder: '0',
  },
  onDragOutPriority: {
    detail: 'Set drag-out event priority',
    numericPlaceholder: '0',
  },
  onFractionalPriorityPriority: {
    detail: 'Set fractional priority event priority',
    numericPlaceholder: '0',
  },
  onModifyAccuracyPriority: {
    detail: 'Set accuracy modifier event priority',
    numericPlaceholder: '0',
  },
  onModifyAtkPriority: {
    detail: 'Set Attack modifier event priority',
    numericPlaceholder: '5',
  },
  onModifyDefPriority: {
    detail: 'Set Defense modifier event priority',
    numericPlaceholder: '5',
  },
  onModifyMovePriority: {
    detail: 'Set modify-move event priority',
    numericPlaceholder: '0',
  },
  onModifySpAPriority: {
    detail: 'Set Special Attack modifier event priority',
    numericPlaceholder: '5',
  },
  onModifySpDPriority: {
    detail: 'Set Special Defense modifier event priority',
    numericPlaceholder: '5',
  },
  onModifyWeightPriority: {
    detail: 'Set weight modifier event priority',
    numericPlaceholder: '0',
  },
  onSourceBasePowerPriority: {
    detail: 'Set source base power event priority',
    numericPlaceholder: '22',
  },
  onSourceModifyAccuracyPriority: {
    detail: 'Set source accuracy modifier event priority',
    numericPlaceholder: '0',
  },
  onSourceModifyDamagePriority: {
    detail: 'Set source damage modifier event priority',
    numericPlaceholder: '0',
  },
  onTryEatItemPriority: {
    detail: 'Set try-eat-item event priority',
    numericPlaceholder: '0',
  },
  onTryHitPriority: {
    detail: 'Set try-hit event priority',
    numericPlaceholder: '0',
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
