import {
  ABILITY_FLAG_KEYS,
  ABILITY_NONSTANDARD_VALUES,
} from '../../abilities/spec';

export interface AbilityBuilderFormData {
  namespace: string;
  abilityName: string;
  fileId: string;
  abilityNumber: string;
  rating: string;
  isNonstandard: string;
  suppressWeather: boolean;
  selectedFlags: string[];
}

export const ABILITY_BUILDER_DEFAULT_NAMESPACE = 'cobblemon';

export const DEFAULT_ABILITY_BUILDER_FORM: AbilityBuilderFormData = {
  namespace: ABILITY_BUILDER_DEFAULT_NAMESPACE,
  abilityName: 'Custom Ability',
  fileId: 'custom_ability',
  abilityNumber: '',
  rating: '2',
  isNonstandard: '',
  suppressWeather: false,
  selectedFlags: [],
};

export const ABILITY_BUILDER_FLAGS = [...ABILITY_FLAG_KEYS] as const;
export const ABILITY_BUILDER_NONSTANDARD_VALUES = [
  ...ABILITY_NONSTANDARD_VALUES,
] as const;
