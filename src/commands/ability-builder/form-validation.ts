import {
  ABILITY_FLAG_KEY_SET,
  ABILITY_NONSTANDARD_VALUE_SET,
} from '../../abilities/spec';
import { type AbilityBuilderFormData } from './types';

export function validateAbilityBuilderFormData(
  data: AbilityBuilderFormData,
): string | undefined {
  if (!/^[a-z0-9_.-]+$/.test(data.namespace.trim())) {
    return 'Namespace must use lowercase id characters.';
  }

  if (data.abilityName.trim().length === 0) {
    return 'Ability name is required.';
  }

  if (!/^[a-z0-9_.-]+$/.test(data.fileId.trim())) {
    return 'File id must use lowercase id characters.';
  }

  if (data.abilityNumber.trim().length > 0) {
    const num = Number.parseInt(data.abilityNumber.trim(), 10);
    if (!/^[0-9]+$/.test(data.abilityNumber.trim()) || num < 1) {
      return 'Ability number must be a positive integer when provided.';
    }
  }

  const rating = Number.parseFloat(data.rating.trim());
  if (data.rating.trim().length === 0 || Number.isNaN(rating)) {
    return 'Rating must be a number between -1 and 5.';
  }
  if (rating < -1 || rating > 5) {
    return 'Rating must be between -1 and 5.';
  }

  if (!data.selectedFlags.every((flag) => ABILITY_FLAG_KEY_SET.has(flag))) {
    return 'One or more selected flags are not supported.';
  }

  if (
    data.isNonstandard.trim().length > 0 &&
    !ABILITY_NONSTANDARD_VALUE_SET.has(data.isNonstandard.trim())
  ) {
    return 'Nonstandard must be empty or one of the supported values.';
  }

  return undefined;
}

export function isAbilityBuilderFormData(
  value: unknown,
): value is AbilityBuilderFormData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  return typeof obj.namespace === 'string'
    && typeof obj.abilityName === 'string'
    && typeof obj.fileId === 'string'
    && typeof obj.abilityNumber === 'string'
    && typeof obj.rating === 'string'
    && typeof obj.isNonstandard === 'string'
    && typeof obj.suppressWeather === 'boolean'
    && Array.isArray(obj.selectedFlags)
    && obj.selectedFlags.every((item) => typeof item === 'string');
}
