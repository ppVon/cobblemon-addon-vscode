import {
  MOVE_BOOST_KEYS,
  MOVE_CATEGORIES,
  MOVE_CONDITION_DECLARATIVE_KEYS,
  MOVE_FLAGS,
  MOVE_HIT_EFFECT_KEYS,
  MOVE_MAXMOVE_KEYS,
  MOVE_SECONDARY_EFFECT_KEYS,
  MOVE_STATUS_CODES,
  MOVE_TARGETS,
  MOVE_TOP_LEVEL_DECLARATIVE_KEYS,
  MOVE_TYPES,
  MOVE_ZMOVE_KEYS,
} from './spec';

export interface CallbackSnippetDefinition {
  readonly key: string;
  readonly detail: string;
  readonly documentation?: string;
  readonly parameters?: readonly string[];
  readonly numericPlaceholder?: string;
}

export const MOVE_CALLBACK_SNIPPETS: readonly CallbackSnippetDefinition[] = [
  { key: 'basePowerCallback', detail: 'Set dynamic base power', parameters: ['pokemon', 'target', 'move'] },
  { key: 'beforeMoveCallback', detail: 'Run before the move is used', parameters: ['pokemon', 'target', 'move'] },
  { key: 'beforeTurnCallback', detail: 'Run before the turn starts', parameters: ['pokemon', 'target'] },
  { key: 'damageCallback', detail: 'Set dynamic damage', parameters: ['pokemon', 'target'] },
  { key: 'priorityChargeCallback', detail: 'Run for charging moves', parameters: ['pokemon'] },
  { key: 'onDisableMove', detail: 'Disable move choices', parameters: ['pokemon'] },
  { key: 'onAfterHit', detail: 'Run after the move hits', parameters: ['target', 'source', 'move'] },
  { key: 'onAfterSubDamage', detail: 'Run after substitute damage', parameters: ['damage', 'target', 'source', 'move'] },
  { key: 'onAfterMoveSecondarySelf', detail: 'Run after self secondary effects', parameters: ['target', 'source', 'move'] },
  { key: 'onAfterMoveSecondary', detail: 'Run after secondary effects', parameters: ['target', 'source', 'move'] },
  { key: 'onAfterMove', detail: 'Run after the move resolves', parameters: ['target', 'source', 'move'] },
  { key: 'onDamagePriority', detail: 'Set damage event priority', numericPlaceholder: '1' },
  { key: 'onDamage', detail: 'Modify incoming damage', parameters: ['damage', 'target', 'source', 'effect'] },
  { key: 'onBasePower', detail: 'Modify base power during damage calculation', parameters: ['basePower', 'pokemon', 'target', 'move'] },
  { key: 'onEffectiveness', detail: 'Modify type effectiveness', parameters: ['typeMod', 'target', 'type', 'move'] },
  { key: 'onHit', detail: 'Run when the move hits', parameters: ['target', 'source', 'move'] },
  { key: 'onHitField', detail: 'Run when the move hits the field', parameters: ['target', 'source', 'move'] },
  { key: 'onHitSide', detail: 'Run when the move hits a side', parameters: ['side', 'source', 'move'] },
  { key: 'onModifyMove', detail: 'Modify move data before use', parameters: ['move', 'pokemon', 'target'] },
  { key: 'onModifyPriority', detail: 'Modify move priority', parameters: ['priority', 'source', 'target', 'move'] },
  { key: 'onMoveFail', detail: 'Run when the move fails', parameters: ['target', 'source', 'move'] },
  { key: 'onModifyType', detail: 'Modify move type', parameters: ['move', 'pokemon', 'target'] },
  { key: 'onModifyTarget', detail: 'Redirect or replace the target', parameters: ['relayVar', 'pokemon', 'target', 'move'] },
  { key: 'onPrepareHit', detail: 'Run before hit animation/effects', parameters: ['target', 'source', 'move'] },
  { key: 'onTry', detail: 'Run before the move proceeds', parameters: ['target', 'source', 'move'] },
  { key: 'onTryHit', detail: 'Run before the move hits a target', parameters: ['target', 'source', 'move'] },
  { key: 'onTryHitField', detail: 'Run before the move hits the field', parameters: ['target', 'source', 'move'] },
  { key: 'onTryHitSide', detail: 'Run before the move hits a side', parameters: ['side', 'source', 'move'] },
  { key: 'onTryImmunity', detail: 'Run before immunity is checked', parameters: ['target', 'source', 'move'] },
  { key: 'onTryMove', detail: 'Run before the move is used', parameters: ['target', 'source', 'move'] },
  { key: 'onUseMoveMessage', detail: 'Customize move-use messaging', parameters: ['target', 'source', 'move'] },
] as const;

export const CONDITION_CALLBACK_SNIPPETS: readonly CallbackSnippetDefinition[] = [
  { key: 'onStart', detail: 'Run when the condition starts', parameters: ['target', 'source', 'effect'] },
  { key: 'onBeforeMove', detail: 'Run before the affected Pokemon moves', parameters: ['pokemon', 'target', 'move'] },
  { key: 'onResidual', detail: 'Run during residual processing', parameters: ['target', 'source', 'effect'] },
  { key: 'onResidualOrder', detail: 'Set residual order', numericPlaceholder: '5' },
  { key: 'onResidualPriority', detail: 'Set residual priority', numericPlaceholder: '0' },
  { key: 'onResidualSubOrder', detail: 'Set residual sub-order', numericPlaceholder: '0' },
  { key: 'onEnd', detail: 'Run when the condition ends', parameters: ['target'] },
  { key: 'onRestart', detail: 'Run when the condition is applied again', parameters: ['target', 'source', 'effect'] },
  { key: 'onTryMove', detail: 'Run before the affected Pokemon moves', parameters: ['target', 'source', 'move'] },
  { key: 'onDisableMove', detail: 'Disable move choices while active', parameters: ['pokemon'] },
  { key: 'onModifyAtk', detail: 'Modify Attack while active', parameters: ['atk', 'pokemon', 'target', 'move'] },
  { key: 'onModifyDef', detail: 'Modify Defense while active', parameters: ['def', 'pokemon', 'target', 'move'] },
  { key: 'onModifySpA', detail: 'Modify Special Attack while active', parameters: ['spa', 'pokemon', 'target', 'move'] },
  { key: 'onModifySpD', detail: 'Modify Special Defense while active', parameters: ['spd', 'pokemon', 'target', 'move'] },
  { key: 'onModifySpe', detail: 'Modify Speed while active', parameters: ['spe', 'pokemon'] },
  { key: 'onModifyMove', detail: 'Modify move data while active', parameters: ['move', 'pokemon', 'target'] },
] as const;

export function buildCallbackMemberSnippet(
  definition: CallbackSnippetDefinition,
): string {
  if (definition.numericPlaceholder) {
    return `${definition.key}: \${1:${definition.numericPlaceholder}},`;
  }

  const parameters = definition.parameters?.join(', ') ?? '';
  return `${definition.key}(${parameters}) {\n\t$0\n},`;
}

export function buildTopLevelPropertySnippet(key: string): string {
  switch (key) {
    case 'num':
      return 'num: ${1:1000},';
    case 'accuracy':
      return 'accuracy: ${1:100},';
    case 'basePower':
      return 'basePower: ${1:80},';
    case 'category':
      return `category: '${snippetChoice(MOVE_CATEGORIES)}',`;
    case 'name':
      return 'name: "${1:My Move}",';
    case 'pp':
      return 'pp: ${1:15},';
    case 'priority':
      return 'priority: ${1:0},';
    case 'flags':
      return 'flags: {\n\tprotect: 1,\n\t$0\n},';
    case 'secondary':
      return 'secondary: null,';
    case 'target':
      return `target: '${snippetChoice(MOVE_TARGETS)}',`;
    case 'type':
      return `type: '${snippetChoice(MOVE_TYPES)}',`;
    case 'contestType':
      return 'contestType: "${1:Cool}",';
    case 'status':
      return `status: '${snippetChoice(MOVE_STATUS_CODES)}',`;
    case 'volatileStatus':
      return 'volatileStatus: "${1:confusion}",';
    case 'sideCondition':
      return 'sideCondition: "${1:stealthrock}",';
    case 'slotCondition':
      return 'slotCondition: "${1:Wish}",';
    case 'pseudoWeather':
      return 'pseudoWeather: "${1:trickroom}",';
    case 'terrain':
      return 'terrain: "${1:electricterrain}",';
    case 'weather':
      return 'weather: "${1:sunnyday}",';
    case 'boosts':
      return `boosts: {\n\t${MOVE_BOOST_KEYS[0]}: \${1:1},\n},`;
    case 'drain':
      return 'drain: [${1:1}, ${2:2}],';
    case 'heal':
      return 'heal: [${1:1}, ${2:2}],';
    case 'recoil':
      return 'recoil: [${1:1}, ${2:4}],';
    case 'multihit':
      return 'multihit: [${1:2}, ${2:5}],';
    case 'zMove':
      return 'zMove: {\n\tbasePower: ${1:160},\n},';
    case 'maxMove':
      return 'maxMove: {\n\tbasePower: ${1:130},\n},';
    case 'selfBoost':
      return `selfBoost: {\n\tboosts: {\n\t\t${MOVE_BOOST_KEYS[0]}: \${1:1},\n\t},\n},`;
    case 'secondaries':
      return `secondaries: [\n\t{\n\t\tchance: \${1:30},\n\t\tstatus: '${snippetChoice(MOVE_STATUS_CODES, 2)}',\n\t},\n],`;
    case 'self':
      return 'self: {\n\t$0\n},';
    case 'condition':
      return 'condition: {\n\t$0\n},';
    default:
      return `${key}: \${1:null},`;
  }
}

export function buildNestedPropertySnippet(
  context:
    | 'flags'
    | 'boosts'
    | 'secondary-effect'
    | 'hit-effect'
    | 'zMove'
    | 'maxMove'
    | 'selfBoost'
    | 'condition'
    | 'ignoreImmunity',
  key: string,
): string {
  switch (context) {
    case 'flags':
      return `${key}: 1,`;
    case 'boosts':
      return `${key}: \${1:1},`;
    case 'secondary-effect':
      if (key === 'chance') {
        return 'chance: ${1:30},';
      }
      if (key === 'status') {
        return `status: '${snippetChoice(MOVE_STATUS_CODES)}',`;
      }
      if (key === 'boosts') {
        return `boosts: {\n\t${MOVE_BOOST_KEYS[0]}: \${1:1},\n},`;
      }
      if (key === 'self') {
        return 'self: {\n\t$0\n},';
      }
      if (key === 'dustproof' || key === 'kingsrock') {
        return `${key}: true,`;
      }
      if (key === 'ability') {
        return 'ability: ${1:source.getAbility()},';
      }
      return buildNestedPropertySnippet('hit-effect', key);
    case 'hit-effect':
      if (key === 'status') {
        return `status: '${snippetChoice(MOVE_STATUS_CODES)}',`;
      }
      if (key === 'volatileStatus') {
        return 'volatileStatus: "${1:confusion}",';
      }
      if (key === 'sideCondition') {
        return 'sideCondition: "${1:stealthrock}",';
      }
      if (key === 'slotCondition') {
        return 'slotCondition: "${1:Wish}",';
      }
      if (key === 'pseudoWeather') {
        return 'pseudoWeather: "${1:trickroom}",';
      }
      if (key === 'terrain') {
        return 'terrain: "${1:electricterrain}",';
      }
      if (key === 'weather') {
        return 'weather: "${1:sunnyday}",';
      }
      if (key === 'boosts') {
        return `boosts: {\n\t${MOVE_BOOST_KEYS[0]}: \${1:1},\n},`;
      }
      return `${key}: \${1:null},`;
    case 'zMove':
      if (key === 'basePower') {
        return 'basePower: ${1:160},';
      }
      if (key === 'effect') {
        return 'effect: "${1:crit2}",';
      }
      return `boost: {\n\t${MOVE_BOOST_KEYS[0]}: \${1:1},\n},`;
    case 'maxMove':
      return 'basePower: ${1:130},';
    case 'selfBoost':
      return `boosts: {\n\t${MOVE_BOOST_KEYS[0]}: \${1:1},\n},`;
    case 'condition':
      return 'duration: ${1:2},';
    case 'ignoreImmunity':
      return `${key}: true,`;
  }
}

export const TOP_LEVEL_MOVE_COMPLETION_KEYS = [...MOVE_TOP_LEVEL_DECLARATIVE_KEYS] as const;
export const CONDITION_COMPLETION_KEYS = [...MOVE_CONDITION_DECLARATIVE_KEYS] as const;
export const FLAGS_COMPLETION_KEYS = [...MOVE_FLAGS] as const;
export const BOOSTS_COMPLETION_KEYS = [...MOVE_BOOST_KEYS] as const;
export const SECONDARY_EFFECT_COMPLETION_KEYS = [...MOVE_SECONDARY_EFFECT_KEYS] as const;
export const HIT_EFFECT_COMPLETION_KEYS = [...MOVE_HIT_EFFECT_KEYS] as const;
export const ZMOVE_COMPLETION_KEYS = [...MOVE_ZMOVE_KEYS] as const;
export const MAXMOVE_COMPLETION_KEYS = [...MOVE_MAXMOVE_KEYS] as const;

function snippetChoice(values: readonly string[], placeholder = 1): string {
  return `\${${placeholder}|${values.map(escapeSnippetChoice).join(',')}|}`;
}

function escapeSnippetChoice(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/,/g, '\\,');
}
