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
  'normal',
  'randomNormal',
  'any',
  'scripted',
  'all',
  'allAdjacentFoes',
  'allAdjacent',
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
  'confusion',
  'flinch',
  'charge',
  'mustrecharge',
  'protect',
  'foresight',
  'substitute',
  'partiallytrapped',
] as const;
export const MOVE_VOLATILE_STATUS_SET = new Set<string>(MOVE_VOLATILE_STATUSES);

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
  'protect',
  'mirror',
  'metronome',
  'allyanim',
  'contact',
  'snatch',
  'reflectable',
  'bite',
  'bullet',
  'dance',
  'defrost',
  'explosive',
  'powder',
  'pulse',
  'punch',
  'slicing',
  'sound',
  'wind',
  'futuremove',
  'heal',
  'pledgecombo',
  'charge',
  'recharge',
  'cantusetwice',
  'bypasssub',
  'distance',
  'failencore',
  'nosleeptalk',
  'noassist',
  'failcopycat',
  'failmimic',
  'failinstruct',
  'failmefirst',
  'nonsky',
  'gravity',
  'noparentalbond',
] as const;
export const MOVE_FLAG_SET = new Set<string>(MOVE_FLAGS);

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
  'forceSwitch',
  'recoil',
  'struggleRecoil',
  'mindBlownRecoil',
  'hasCrashDamage',
  'status',
  'volatileStatus',
  'sideCondition',
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
export const MOVE_TOP_LEVEL_DECLARATIVE_KEY_SET = new Set<string>(MOVE_TOP_LEVEL_DECLARATIVE_KEYS);

export const MOVE_CONDITION_DECLARATIVE_KEYS = ['duration'] as const;
export const MOVE_CONDITION_DECLARATIVE_KEY_SET = new Set<string>(MOVE_CONDITION_DECLARATIVE_KEYS);

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
  boosts?: Partial<Record<typeof MOVE_BOOST_KEYS[number], number>>;
  drain?: [number, number];
  heal?: [number, number];
  ohko?: true;
  critRatio?: number;
  multihit?: number | [number, number];
  stallingMove?: true;
  selfSwitch?: true | typeof MOVE_SELF_SWITCH_VALUES[number];
  selfdestruct?: typeof MOVE_SELFDESTRUCT_VALUES[number];
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
  return /^on[A-Z]/.test(key) || /Callback$/.test(key);
}

export function isValidJsIdentifierKey(key: string): boolean {
  return /^[$A-Z_a-z][$0-9A-Z_a-z]*$/.test(key);
}
