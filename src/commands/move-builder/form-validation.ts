import {
  MOVE_BOOST_KEY_SET,
  MOVE_CATEGORY_SET,
  MOVE_CONTEST_TYPE_SET,
  MOVE_FLAG_SET,
  MOVE_SELFDESTRUCT_VALUE_SET,
  MOVE_SELF_SWITCH_VALUE_SET,
  MOVE_STATUS_CODE_SET,
  MOVE_TARGET_SET,
  MOVE_TYPE_SET,
} from '../../moves/spec';
import { type MoveBuilderFormData } from './types';

export function validateMoveBuilderFormData(
  data: MoveBuilderFormData,
): string | undefined {
  if (!/^[a-z0-9_.-]+$/.test(data.namespace.trim())) {
    return 'Namespace must use lowercase id characters.';
  }

  if (data.moveName.trim().length === 0) {
    return 'Move name is required.';
  }

  if (!/^[a-z0-9_.-]+$/.test(data.fileId.trim())) {
    return 'File id must use lowercase id characters.';
  }

  if (data.moveNumber.trim().length > 0) {
    const num = Number.parseInt(data.moveNumber.trim(), 10);
    if (!/^[0-9]+$/.test(data.moveNumber.trim()) || num < 1) {
      return 'Move number must be a positive integer when provided.';
    }
  }

  if (!MOVE_CATEGORY_SET.has(data.category.trim())) {
    return 'Category must be one of the supported move categories.';
  }

  if (!MOVE_TYPE_SET.has(data.type.trim())) {
    return 'Type must be one of the supported Cobblemon types.';
  }

  if (!MOVE_TARGET_SET.has(data.target.trim())) {
    return 'Target must be one of the supported move targets.';
  }

  if (
    data.contestType.trim().length > 0 &&
    !MOVE_CONTEST_TYPE_SET.has(data.contestType.trim())
  ) {
    return 'Contest type must be empty or one of the supported values.';
  }

  if (!/^[0-9]+$/.test(data.pp.trim()) || Number.parseInt(data.pp.trim(), 10) < 1) {
    return 'PP must be a positive integer.';
  }

  if (!/^-?[0-9]+$/.test(data.priority.trim())) {
    return 'Priority must be an integer.';
  }
  const priority = Number.parseInt(data.priority.trim(), 10);
  if (priority < -6 || priority > 6) {
    return 'Priority must be between -6 and 6.';
  }

  if (data.accuracyMode === 'number') {
    if (!/^[0-9]+$/.test(data.accuracyValue.trim())) {
      return 'Accuracy must be a whole number when always-hit is disabled.';
    }
    const accuracy = Number.parseInt(data.accuracyValue.trim(), 10);
    if (accuracy < 1 || accuracy > 100) {
      return 'Accuracy must be between 1 and 100.';
    }
  }

  if (!/^[0-9]+$/.test(data.basePower.trim())) {
    return 'Base power must be a whole number.';
  }
  const basePower = Number.parseInt(data.basePower.trim(), 10);
  if (basePower < 0) {
    return 'Base power cannot be negative.';
  }
  if (data.category.trim() === 'Status' && basePower !== 0) {
    return 'Status moves must use base power 0.';
  }

  if (!data.selectedFlags.every((flag) => MOVE_FLAG_SET.has(flag))) {
    return 'One or more selected flags are not supported.';
  }

  const topLevelStatus = data.status.trim();
  if (topLevelStatus.length > 0 && !MOVE_STATUS_CODE_SET.has(topLevelStatus)) {
    return 'Primary status must use a supported status code.';
  }

  if (
    data.volatileStatus.trim().length > 0 &&
    !/^[a-z][a-z0-9_]*$/i.test(data.volatileStatus.trim())
  ) {
    return 'Volatile status must use an identifier-like value.';
  }

  if (
    data.sideCondition.trim().length > 0 &&
    !/^[a-z][a-z0-9_]*$/i.test(data.sideCondition.trim())
  ) {
    return 'Side condition must use an identifier-like value.';
  }

  const boostError = validateBoostPair(
    data.boostStat.trim(),
    data.boostStages.trim(),
    'Primary boosts',
  );
  if (boostError) {
    return boostError;
  }

  const recoilError = validateFractionPair(
    data.recoilNumerator.trim(),
    data.recoilDenominator.trim(),
    'Recoil',
  );
  if (recoilError) {
    return recoilError;
  }

  const drainError = validateFractionPair(
    data.drainNumerator.trim(),
    data.drainDenominator.trim(),
    'Drain',
  );
  if (drainError) {
    return drainError;
  }

  const healError = validateFractionPair(
    data.healNumerator.trim(),
    data.healDenominator.trim(),
    'Heal',
  );
  if (healError) {
    return healError;
  }

  if (data.critRatio.trim().length > 0) {
    if (!/^[0-9]+$/.test(data.critRatio.trim())) {
      return 'Crit ratio must be a positive integer when provided.';
    }
    if (Number.parseInt(data.critRatio.trim(), 10) < 1) {
      return 'Crit ratio must be at least 1.';
    }
  }

  if (data.multihitMode === 'fixed') {
    if (!/^[0-9]+$/.test(data.multihitValue.trim())) {
      return 'Fixed multihit count must be a positive integer.';
    }
    if (Number.parseInt(data.multihitValue.trim(), 10) < 1) {
      return 'Fixed multihit count must be at least 1.';
    }
  }

  if (data.multihitMode === 'range') {
    if (
      !/^[0-9]+$/.test(data.multihitMin.trim()) ||
      !/^[0-9]+$/.test(data.multihitMax.trim())
    ) {
      return 'Multihit range values must be positive integers.';
    }
    const min = Number.parseInt(data.multihitMin.trim(), 10);
    const max = Number.parseInt(data.multihitMax.trim(), 10);
    if (min < 1 || max < min) {
      return 'Multihit range must use positive integers where max >= min.';
    }
  }

  if (
    data.selfSwitch.trim().length > 0 &&
    data.selfSwitch !== 'true' &&
    !MOVE_SELF_SWITCH_VALUE_SET.has(data.selfSwitch)
  ) {
    return 'Self switch must be empty, true, copyvolatile, or shedtail.';
  }

  if (
    data.selfdestruct.trim().length > 0 &&
    !MOVE_SELFDESTRUCT_VALUE_SET.has(data.selfdestruct)
  ) {
    return 'Selfdestruct must be empty, always, or ifHit.';
  }

  const secondaryStatus = data.secondaryStatus.trim();
  if (
    secondaryStatus.length > 0 &&
    !MOVE_STATUS_CODE_SET.has(secondaryStatus)
  ) {
    return 'Secondary status must use a supported status code.';
  }

  if (
    data.secondaryVolatileStatus.trim().length > 0 &&
    !/^[a-z][a-z0-9_]*$/i.test(data.secondaryVolatileStatus.trim())
  ) {
    return 'Secondary volatile status must use an identifier-like value.';
  }

  const secondaryBoostError = validateBoostPair(
    data.secondaryBoostStat.trim(),
    data.secondaryBoostStages.trim(),
    'Secondary boosts',
  );
  if (secondaryBoostError) {
    return secondaryBoostError;
  }

  const hasSecondaryEffect =
    secondaryStatus.length > 0 ||
    data.secondaryVolatileStatus.trim().length > 0 ||
    data.secondaryBoostStat.trim().length > 0;
  if (hasSecondaryEffect) {
    if (!/^[0-9]+$/.test(data.secondaryChance.trim())) {
      return 'Secondary chance must be a positive integer when a secondary effect is configured.';
    }
    const chance = Number.parseInt(data.secondaryChance.trim(), 10);
    if (chance < 1 || chance > 100) {
      return 'Secondary chance must be between 1 and 100.';
    }
  } else if (data.secondaryChance.trim().length > 0) {
    return 'Secondary chance was provided without a secondary effect.';
  }

  return undefined;
}

export function isMoveBuilderFormData(
  value: unknown,
): value is MoveBuilderFormData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  return typeof obj.namespace === 'string'
    && typeof obj.moveName === 'string'
    && typeof obj.fileId === 'string'
    && typeof obj.moveNumber === 'string'
    && (obj.accuracyMode === 'number' || obj.accuracyMode === 'always')
    && typeof obj.accuracyValue === 'string'
    && typeof obj.basePower === 'string'
    && typeof obj.category === 'string'
    && typeof obj.pp === 'string'
    && typeof obj.priority === 'string'
    && typeof obj.target === 'string'
    && typeof obj.type === 'string'
    && typeof obj.contestType === 'string'
    && Array.isArray(obj.selectedFlags)
    && obj.selectedFlags.every((item) => typeof item === 'string')
    && typeof obj.status === 'string'
    && typeof obj.volatileStatus === 'string'
    && typeof obj.sideCondition === 'string'
    && typeof obj.boostStat === 'string'
    && typeof obj.boostStages === 'string'
    && typeof obj.recoilNumerator === 'string'
    && typeof obj.recoilDenominator === 'string'
    && typeof obj.drainNumerator === 'string'
    && typeof obj.drainDenominator === 'string'
    && typeof obj.healNumerator === 'string'
    && typeof obj.healDenominator === 'string'
    && typeof obj.critRatio === 'string'
    && (obj.multihitMode === 'none' || obj.multihitMode === 'fixed' || obj.multihitMode === 'range')
    && typeof obj.multihitValue === 'string'
    && typeof obj.multihitMin === 'string'
    && typeof obj.multihitMax === 'string'
    && typeof obj.forceSwitch === 'boolean'
    && typeof obj.stallingMove === 'boolean'
    && typeof obj.ohko === 'boolean'
    && typeof obj.selfSwitch === 'string'
    && typeof obj.selfdestruct === 'string'
    && typeof obj.struggleRecoil === 'boolean'
    && typeof obj.mindBlownRecoil === 'boolean'
    && typeof obj.hasCrashDamage === 'boolean'
    && typeof obj.ignoreAbility === 'boolean'
    && typeof obj.ignoreImmunity === 'boolean'
    && typeof obj.ignoreDefensive === 'boolean'
    && typeof obj.ignoreEvasion === 'boolean'
    && typeof obj.secondaryChance === 'string'
    && typeof obj.secondaryStatus === 'string'
    && typeof obj.secondaryVolatileStatus === 'string'
    && typeof obj.secondaryBoostStat === 'string'
    && typeof obj.secondaryBoostStages === 'string';
}

function validateBoostPair(
  stat: string,
  stages: string,
  label: string,
): string | undefined {
  if (!stat && !stages) {
    return undefined;
  }

  if (!stat || !stages) {
    return `${label} require both a stat and a stages value.`;
  }

  if (!MOVE_BOOST_KEY_SET.has(stat)) {
    return `${label} must use a supported boost stat.`;
  }

  if (!/^-?[0-9]+$/.test(stages)) {
    return `${label} stages must be an integer.`;
  }

  const amount = Number.parseInt(stages, 10);
  if (amount < -6 || amount > 6 || amount === 0) {
    return `${label} stages must be between -6 and 6 and cannot be 0.`;
  }

  return undefined;
}

function validateFractionPair(
  numerator: string,
  denominator: string,
  label: string,
): string | undefined {
  if (!numerator && !denominator) {
    return undefined;
  }

  if (!numerator || !denominator) {
    return `${label} requires both a numerator and denominator.`;
  }

  if (!/^[0-9]+$/.test(numerator) || !/^[0-9]+$/.test(denominator)) {
    return `${label} values must be positive integers.`;
  }

  if (
    Number.parseInt(numerator, 10) < 1 ||
    Number.parseInt(denominator, 10) < 1
  ) {
    return `${label} values must be positive integers.`;
  }

  return undefined;
}
