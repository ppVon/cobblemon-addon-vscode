import { type PokemonBuilderTemplateArgs } from './types';

export function buildPokemonSpeciesTemplate(args: PokemonBuilderTemplateArgs): Record<string, unknown> {
  const moving: Record<string, unknown> = {
    walk: {
      canWalk: true,
      walkSpeed: 0.25,
    },
  };

  if (args.includeSwim) {
    moving.swim = {
      canSwimInWater: true,
      avoidsWater: false,
      swimSpeed: 0.2,
    };
  }

  if (args.includeFlight) {
    moving.fly = {
      canFly: true,
      flySpeedHorizontal: 0.25,
    };
  }

  const species: Record<string, unknown> = {
    implemented: true,
    nationalPokedexNumber: args.dexNumber,
    name: args.speciesName,
    primaryType: args.primaryType,
    ...(args.secondaryType ? { secondaryType: args.secondaryType } : {}),
    maleRatio: 0.5,
    height: 10,
    weight: 100,
    pokedex: [`${args.namespace}.species.${args.speciesId}.desc`],
    labels: ['custom'],
    aspects: [],
    abilities: [],
    eggGroups: [],
    baseStats: {
      hp: 50,
      attack: 50,
      defence: 50,
      special_attack: 50,
      special_defence: 50,
      speed: 50,
    },
    evYield: {
      hp: 0,
      attack: 0,
      defence: 0,
      special_attack: 0,
      special_defence: 0,
      speed: 0,
    },
    baseExperienceYield: 100,
    experienceGroup: 'medium_fast',
    catchRate: 45,
    eggCycles: 20,
    baseFriendship: 50,
    behaviour: {
      moving,
    },
    moves: [],
    evolutions: [],
  };

  const mountBehaviours: Record<string, Record<string, unknown>> = {};
  if (args.includeMountLand) {
    mountBehaviours.LAND = {};
  }
  if (args.includeMountAir) {
    mountBehaviours.AIR = {};
  }
  if (args.includeMountLiquid) {
    mountBehaviours.LIQUID = {};
  }
  if (Object.keys(mountBehaviours).length > 0) {
    species.riding = {
      behaviours: mountBehaviours,
    };
  }

  if (args.includeSwim) {
    species.swimmingEyeHeight = 0.6;
  }

  if (args.includeFlight) {
    species.flyingEyeHeight = 0.9;
  }

  if (args.featureKeys.length > 0) {
    species.features = args.featureKeys;
  }

  return species;
}

export function buildPokemonResolverTemplate(args: PokemonBuilderTemplateArgs): Record<string, unknown> {
  const variations: Array<Record<string, unknown>> = [
    {
      aspects: [],
      poser: `${args.namespace}:${args.speciesId}`,
      model: `${args.namespace}:${args.speciesId}.geo`,
      texture: `${args.namespace}:textures/pokemon/${args.folderName}/${args.speciesId}.png`,
      layers: [],
    },
  ];

  if (args.includeShiny) {
    variations.push({
      aspects: ['shiny'],
      texture: `${args.namespace}:textures/pokemon/${args.folderName}/${args.speciesId}_shiny.png`,
    });
  }

  return {
    species: `${args.namespace}:${args.speciesId}`,
    order: 0,
    variations,
  };
}

export function buildPokemonPoserTemplate(args: PokemonBuilderTemplateArgs): Record<string, unknown> {
  const poses: Record<string, unknown> = {
    standing: {
      poseTypes: ['STAND', 'NONE', 'PORTRAIT', 'PROFILE'],
      animations: [],
    },
  };

  if (args.includeSwim) {
    poses.swimming = {
      poseTypes: ['SWIM'],
      animations: [],
    };
  }

  if (args.includeFlight) {
    poses.flying = {
      poseTypes: ['FLY'],
      animations: [],
    };
  }

  return {
    rootBone: args.speciesId,
    portraitScale: 1.0,
    portraitTranslation: [0, 0, 0],
    profileScale: 1.0,
    profileTranslation: [0, 0, 0],
    poses,
  };
}
