export const MOVE_CATEGORIES = ['Physical', 'Special', 'Status'] as const;
export const MOVE_CATEGORY_SET = new Set<string>(MOVE_CATEGORIES);

export const MOVE_TYPES = [
  'Normal',
  'Fire',
  'Water',
  'Electric',
  'Grass',
  'Ice',
  'Fighting',
  'Poison',
  'Ground',
  'Flying',
  'Psychic',
  'Bug',
  'Rock',
  'Ghost',
  'Dragon',
  'Dark',
  'Steel',
  'Fairy',
] as const;
export const MOVE_TYPE_SET = new Set<string>(MOVE_TYPES);

export const MOVE_TARGETS = [
  'self',
  'adjacentAlly',
  'adjacentAllyOrSelf',
  'adjacentFoe',
  'normal',
  'randomNormal',
  'any',
  'scripted',
  'all',
  'allAdjacentFoes',
  'allAdjacent',
  'allies',
  'allySide',
  'allyTeam',
  'foeSide',
] as const;
export const MOVE_TARGET_SET = new Set<string>(MOVE_TARGETS);

export const MOVE_CONTEST_TYPES = [
  'Beautiful',
  'Clever',
  'Cool',
  'Cute',
  'Tough',
] as const;
export const MOVE_CONTEST_TYPE_SET = new Set<string>(MOVE_CONTEST_TYPES);

export const MOVE_STATUS_CODES = ['brn', 'par', 'slp', 'frz', 'psn', 'tox'] as const;
export const MOVE_STATUS_CODE_SET = new Set<string>(MOVE_STATUS_CODES);

export const MOVE_VOLATILE_STATUSES = [
  'aquaring',
  'attract',
  'banefulbunker',
  'bide',
  'burningbulwark',
  'confusion',
  'charge',
  'curse',
  'defensecurl',
  'destinybond',
  'disable',
  'dragoncheer',
  'electrify',
  'embargo',
  'encore',
  'endure',
  'flinch',
  'focusenergy',
  'followme',
  'foresight',
  'gastroacid',
  'glaiverush',
  'grudge',
  'healblock',
  'helpinghand',
  'imprison',
  'ingrain',
  'kingsshield',
  'laserfocus',
  'leechseed',
  'lockedmove',
  'magiccoat',
  'magnetrise',
  'maxguard',
  'minimize',
  'miracleeye',
  'mustrecharge',
  'nightmare',
  'noretreat',
  'obstruct',
  'octolock',
  'partiallytrapped',
  'powder',
  'powershift',
  'powertrick',
  'protect',
  'rage',
  'ragepowder',
  'roost',
  'saltcure',
  'silktrap',
  'smackdown',
  'snatch',
  'sparklingaria',
  'spikyshield',
  'spotlight',
  'stockpile',
  'substitute',
  'syrupbomb',
  'tarshot',
  'taunt',
  'telekinesis',
  'torment',
  'uproar',
  'yawn',
] as const;
export const MOVE_VOLATILE_STATUS_SET = new Set<string>(MOVE_VOLATILE_STATUSES);

export const MOVE_SIDE_CONDITIONS = [
  'auroraveil',
  'craftyshield',
  'lightscreen',
  'luckychant',
  'matblock',
  'mist',
  'quickguard',
  'reflect',
  'safeguard',
  'spikes',
  'stealthrock',
  'stickyweb',
  'tailwind',
  'toxicspikes',
  'waterpledge',
  'wideguard',
] as const;
export const MOVE_SIDE_CONDITION_SET = new Set<string>(MOVE_SIDE_CONDITIONS);

export const MOVE_SLOT_CONDITIONS = [
  'Wish',
  'healingwish',
  'lunardance',
  'revivalblessing',
] as const;
export const MOVE_SLOT_CONDITION_SET = new Set<string>(MOVE_SLOT_CONDITIONS);

export const MOVE_TERRAINS = [
  'electricterrain',
  'grassyterrain',
  'mistyterrain',
  'psychicterrain',
] as const;
export const MOVE_TERRAIN_SET = new Set<string>(MOVE_TERRAINS);

export const MOVE_WEATHERS = [
  'RainDance',
  'Sandstorm',
  'hail',
  'snow',
  'sunnyday',
] as const;
export const MOVE_WEATHER_SET = new Set<string>(MOVE_WEATHERS);

export const MOVE_PSEUDO_WEATHERS = [
  'fairylock',
  'gravity',
  'iondeluge',
  'magicroom',
  'mudsport',
  'trickroom',
  'watersport',
  'wonderroom',
] as const;
export const MOVE_PSEUDO_WEATHER_SET = new Set<string>(MOVE_PSEUDO_WEATHERS);

export const MOVE_BOOST_KEYS = [
  'atk',
  'def',
  'spa',
  'spd',
  'spe',
  'accuracy',
  'evasion',
] as const;
export const MOVE_BOOST_KEY_SET = new Set<string>(MOVE_BOOST_KEYS);

export const MOVE_FLAGS = [
  'allyanim',
  'bypasssub',
  'bite',
  'bullet',
  'cantusetwice',
  'charge',
  'contact',
  'dance',
  'defrost',
  'distance',
  'failcopycat',
  'failencore',
  'failinstruct',
  'failmefirst',
  'failmimic',
  'futuremove',
  'gravity',
  'heal',
  'metronome',
  'mirror',
  'mustpressure',
  'noassist',
  'nonsky',
  'noparentalbond',
  'nosleeptalk',
  'pledgecombo',
  'powder',
  'protect',
  'pulse',
  'punch',
  'recharge',
  'reflectable',
  'slicing',
  'snatch',
  'sound',
  'wind',
] as const;
export const MOVE_FLAG_SET = new Set<string>(MOVE_FLAGS);

export const MOVE_NONSTANDARD_VALUES = [
  'Past',
  'Unobtainable',
  'Gigantamax',
  'LGPE',
  'CAP',
  'Future',
] as const;
export const MOVE_NONSTANDARD_VALUE_SET = new Set<string>(MOVE_NONSTANDARD_VALUES);

export const MOVE_SELF_SWITCH_VALUES = ['copyvolatile', 'shedtail'] as const;
export const MOVE_SELF_SWITCH_VALUE_SET = new Set<string>(MOVE_SELF_SWITCH_VALUES);

export const MOVE_SELFDESTRUCT_VALUES = ['always', 'ifHit'] as const;
export const MOVE_SELFDESTRUCT_VALUE_SET = new Set<string>(MOVE_SELFDESTRUCT_VALUES);

export const MOVE_TOP_LEVEL_DECLARATIVE_KEYS = [
  'num',
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
  'contestType',
  'isNonstandard',
  'realMove',
  'damage',
  'noPPBoosts',
  'isMax',
  'forceSwitch',
  'thawsTarget',
  'recoil',
  'struggleRecoil',
  'mindBlownRecoil',
  'hasCrashDamage',
  'status',
  'volatileStatus',
  'sideCondition',
  'slotCondition',
  'pseudoWeather',
  'terrain',
  'weather',
  'boosts',
  'drain',
  'heal',
  'ohko',
  'breaksProtect',
  'selfBoost',
  'stealsBoosts',
  'critRatio',
  'multihit',
  'secondaries',
  'self',
  'hasSheerForce',
  'alwaysHit',
  'baseMoveType',
  'basePowerModifier',
  'critModifier',
  'forceSTAB',
  'ignoreAccuracy',
  'selfSwitch',
  'selfdestruct',
  'isZ',
  'zMove',
  'maxMove',
  'ignoreAbility',
  'ignoreImmunity',
  'ignoreDefensive',
  'ignoreEvasion',
  'ignoreNegativeOffensive',
  'ignoreOffensive',
  'ignorePositiveDefensive',
  'ignorePositiveEvasion',
  'multiaccuracy',
  'multihitType',
  'noDamageVariance',
  'nonGhostTarget',
  'overrideDefensivePokemon',
  'overrideDefensiveStat',
  'overrideOffensivePokemon',
  'overrideOffensiveStat',
  'pressureTarget',
  'sleepUsable',
  'spreadModifier',
  'stallingMove',
  'condition',
] as const;
export const MOVE_TOP_LEVEL_DECLARATIVE_KEY_SET = new Set<string>(MOVE_TOP_LEVEL_DECLARATIVE_KEYS);

export const MOVE_CONDITION_DECLARATIVE_KEYS = ['duration'] as const;
export const MOVE_CONDITION_DECLARATIVE_KEY_SET = new Set<string>(MOVE_CONDITION_DECLARATIVE_KEYS);

export const MOVE_HIT_EFFECT_KEYS = [
  'boosts',
  'status',
  'volatileStatus',
  'sideCondition',
  'slotCondition',
  'pseudoWeather',
  'terrain',
  'weather',
] as const;
export const MOVE_HIT_EFFECT_KEY_SET = new Set<string>(MOVE_HIT_EFFECT_KEYS);

export const MOVE_SECONDARY_EFFECT_KEYS = [
  'chance',
  'ability',
  'dustproof',
  'kingsrock',
  'self',
  ...MOVE_HIT_EFFECT_KEYS,
] as const;
export const MOVE_SECONDARY_EFFECT_KEY_SET = new Set<string>(MOVE_SECONDARY_EFFECT_KEYS);

export const MOVE_ZMOVE_KEYS = ['basePower', 'effect', 'boost'] as const;
export const MOVE_ZMOVE_KEY_SET = new Set<string>(MOVE_ZMOVE_KEYS);

export const MOVE_MAXMOVE_KEYS = ['basePower'] as const;
export const MOVE_MAXMOVE_KEY_SET = new Set<string>(MOVE_MAXMOVE_KEYS);

export const MOVE_SELF_BOOST_KEYS = ['boosts'] as const;
export const MOVE_SELF_BOOST_KEY_SET = new Set<string>(MOVE_SELF_BOOST_KEYS);

export const MOVE_OVERRIDE_POKEMON_VALUES = ['target', 'source'] as const;
export const MOVE_OVERRIDE_POKEMON_VALUE_SET = new Set<string>(MOVE_OVERRIDE_POKEMON_VALUES);

export const MOVE_OVERRIDE_STAT_VALUES = ['atk', 'def', 'spa', 'spd', 'spe'] as const;
export const MOVE_OVERRIDE_STAT_VALUE_SET = new Set<string>(MOVE_OVERRIDE_STAT_VALUES);

export const MOVE_CALLBACK_KEYS = [
  'basePowerCallback',
  'beforeMoveCallback',
  'beforeTurnCallback',
  'damageCallback',
  'priorityChargeCallback',
  'onDisableMove',
  'onAfterHit',
  'onAfterSubDamage',
  'onAfterMoveSecondarySelf',
  'onAfterMoveSecondary',
  'onAfterMove',
  'onDamagePriority',
  'onDamage',
  'onBasePower',
  'onEffectiveness',
  'onHit',
  'onHitField',
  'onHitSide',
  'onModifyMove',
  'onModifyPriority',
  'onMoveFail',
  'onModifyType',
  'onModifyTarget',
  'onPrepareHit',
  'onTry',
  'onTryHit',
  'onTryHitField',
  'onTryHitSide',
  'onTryImmunity',
  'onTryMove',
  'onUseMoveMessage',
] as const;
export const MOVE_CALLBACK_KEY_SET = new Set<string>(MOVE_CALLBACK_KEYS);

export const MOVE_NUMERIC_CALLBACK_KEYS = ['onDamagePriority'] as const;
export const MOVE_NUMERIC_CALLBACK_KEY_SET = new Set<string>(MOVE_NUMERIC_CALLBACK_KEYS);

export const MOVE_TEMPLATE_FIELD_ORDER = [
  'num',
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
  'contestType',
  'isNonstandard',
  'forceSwitch',
  'recoil',
  'struggleRecoil',
  'mindBlownRecoil',
  'hasCrashDamage',
  'status',
  'volatileStatus',
  'sideCondition',
  'slotCondition',
  'pseudoWeather',
  'terrain',
  'weather',
  'boosts',
  'drain',
  'heal',
  'ohko',
  'critRatio',
  'multihit',
  'stallingMove',
  'selfSwitch',
  'selfdestruct',
  'isZ',
  'zMove',
  'maxMove',
  'ignoreAbility',
  'ignoreImmunity',
  'ignoreDefensive',
  'ignoreEvasion',
  'condition',
] as const;

export const MOVE_FLAG_RENDER_ORDER = [...MOVE_FLAGS] as const;

export interface MoveTemplateDefinition {
  num?: number;
  accuracy: number | true;
  basePower: number;
  category: typeof MOVE_CATEGORIES[number];
  name: string;
  pp: number;
  priority: number;
  flags: Record<string, 1>;
  secondary: null | MoveSecondaryTemplate;
  target: typeof MOVE_TARGETS[number];
  type: typeof MOVE_TYPES[number];
  contestType?: typeof MOVE_CONTEST_TYPES[number];
  forceSwitch?: true;
  recoil?: [number, number];
  struggleRecoil?: true;
  mindBlownRecoil?: true;
  hasCrashDamage?: true;
  status?: typeof MOVE_STATUS_CODES[number];
  volatileStatus?: string;
  sideCondition?: string;
  slotCondition?: string;
  pseudoWeather?: string;
  terrain?: string;
  weather?: string;
  boosts?: Partial<Record<typeof MOVE_BOOST_KEYS[number], number>>;
  drain?: [number, number];
  heal?: [number, number];
  ohko?: true;
  critRatio?: number;
  multihit?: number | [number, number];
  stallingMove?: true;
  selfSwitch?: true | typeof MOVE_SELF_SWITCH_VALUES[number];
  selfdestruct?: true | typeof MOVE_SELFDESTRUCT_VALUES[number];
  isZ?: string;
  zMove?: Record<string, unknown>;
  maxMove?: Record<string, unknown>;
  ignoreAbility?: true;
  ignoreImmunity?: true;
  ignoreDefensive?: true;
  ignoreEvasion?: true;
}

export interface MoveSecondaryTemplate {
  chance: number;
  status?: typeof MOVE_STATUS_CODES[number];
  volatileStatus?: string;
  boosts?: Partial<Record<typeof MOVE_BOOST_KEYS[number], number>>;
}

export function isMoveCallbackKey(key: string): boolean {
  return MOVE_CALLBACK_KEY_SET.has(key);
}

export function isMoveCallbackLikeKey(key: string): boolean {
  return /^on[A-Z]/.test(key) || /Callback$/.test(key);
}

export function isMoveNumericCallbackKey(key: string): boolean {
  return MOVE_NUMERIC_CALLBACK_KEY_SET.has(key);
}

export function isConditionCallbackLikeKey(key: string): boolean {
  return /^on[A-Z]/.test(key);
}

export function isConditionNumericCallbackKey(key: string): boolean {
  return /^on[A-Z].*(Priority|Order|SubOrder)$/.test(key);
}

export function isValidJsIdentifierKey(key: string): boolean {
  return /^[$A-Z_a-z][$0-9A-Z_a-z]*$/.test(key);
}
