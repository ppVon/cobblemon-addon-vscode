export const ABILITY_FLAG_KEYS = [
  'breakable',
  'cantsuppress',
  'failroleplay',
  'failskillswap',
  'noentrain',
  'noreceiver',
  'notrace',
  'notransform',
] as const;
export const ABILITY_FLAG_KEY_SET = new Set<string>(ABILITY_FLAG_KEYS);

export const ABILITY_NONSTANDARD_VALUES = [
  'Past',
  'Unobtainable',
  'CAP',
  'Future',
  'LGPE',
  'Gigantamax',
] as const;
export const ABILITY_NONSTANDARD_VALUE_SET = new Set<string>(
  ABILITY_NONSTANDARD_VALUES,
);

export const ABILITY_TOP_LEVEL_DECLARATIVE_KEYS = [
  'name',
  'num',
  'rating',
  'flags',
  'suppressWeather',
  'isNonstandard',
  'condition',
] as const;
export const ABILITY_TOP_LEVEL_DECLARATIVE_KEY_SET = new Set<string>(
  ABILITY_TOP_LEVEL_DECLARATIVE_KEYS,
);

export const ABILITY_CONDITION_DECLARATIVE_KEYS = ['duration'] as const;
export const ABILITY_CONDITION_DECLARATIVE_KEY_SET = new Set<string>(
  ABILITY_CONDITION_DECLARATIVE_KEYS,
);

export const ABILITY_CALLBACK_KEYS = [
  'onStart',
  'onPreStart',
  'onEnd',
  'onSwitchIn',
  'onSwitchOut',
  'onResidual',
  'onResidualOrder',
  'onResidualPriority',
  'onResidualSubOrder',
  'onBasePowerPriority',
  'onBasePower',
  'onModifyAtk',
  'onModifyDef',
  'onModifySpA',
  'onModifySpD',
  'onModifySpe',
  'onModifySTABPriority',
  'onModifySTAB',
  'onModifyBoost',
  'onModifyMove',
  'onModifyPriority',
  'onModifyTypePriority',
  'onModifyType',
  'onDamage',
  'onDamagingHitOrder',
  'onDamagingHit',
  'onAfterMove',
  'onAfterMoveSecondary',
  'onTryHit',
  'onTryMove',
  'onHit',
  'onImmunity',
  'onFoeBasePower',
  'onAllyBasePower',
  'onAnyBasePower',
  'onWeatherModifyDamage',
  'onSourceModifyDamage',
] as const;
export const ABILITY_CALLBACK_KEY_SET = new Set<string>(ABILITY_CALLBACK_KEYS);

export const ABILITY_NUMERIC_CALLBACK_KEYS = [
  'onDamagingHitOrder',
  'onResidualOrder',
  'onResidualPriority',
  'onResidualSubOrder',
  'onModifySTABPriority',
  'onModifyTypePriority',
  'onBasePowerPriority',
] as const;
export const ABILITY_NUMERIC_CALLBACK_KEY_SET = new Set<string>(
  ABILITY_NUMERIC_CALLBACK_KEYS,
);

export const ABILITY_CONDITION_CALLBACK_KEYS = [
  'onStart',
  'onEnd',
  'onResidual',
  'onResidualOrder',
  'onResidualPriority',
  'onResidualSubOrder',
  'onRestart',
  'onTryMove',
  'onDisableMove',
] as const;
export const ABILITY_CONDITION_CALLBACK_KEY_SET = new Set<string>(
  ABILITY_CONDITION_CALLBACK_KEYS,
);

export const ABILITY_TEMPLATE_FIELD_ORDER = [
  'num',
  'name',
  'rating',
  'flags',
  'suppressWeather',
  'isNonstandard',
  'condition',
] as const;

export interface AbilityTemplateDefinition {
  num: number;
  name: string;
  rating: number;
  flags: Record<string, 1>;
  suppressWeather?: true;
  isNonstandard?: string;
  condition?: Record<string, unknown>;
}

export function isAbilityCallbackKey(key: string): boolean {
  return ABILITY_CALLBACK_KEY_SET.has(key);
}

export function isAbilityCallbackLikeKey(key: string): boolean {
  return /^on[A-Z]/.test(key);
}

export function isAbilityNumericCallbackKey(key: string): boolean {
  return ABILITY_NUMERIC_CALLBACK_KEY_SET.has(key);
}

export function isAbilityConditionCallbackKey(key: string): boolean {
  return ABILITY_CONDITION_CALLBACK_KEY_SET.has(key);
}

export { isValidJsIdentifierKey } from '../moves/spec';
