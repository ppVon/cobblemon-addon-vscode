# 0.11.0

- Update schemas for Cobblemon 1.8.0
  - Species and forms support `signatureMoves` and `defaultWildMovesetBuilder`
  - Riding seats support `condition`, and no longer accept the removed `offset` and `poseOffsets`
  - Spawn pool files no longer require `enabled`
  - Herd spawns support `isFollower`, `herdLevelRange`, and `heldItem`
  - Pokemon interactions no longer require `cooldown`
  - Species features support the `weighted_choice` type, where `choices` maps each choice to a weight
  - Marks support `aspects` and `sortOrder`
  - NPC parties support the `composed_pool` provider, and provider types may be namespaced
  - Action effect keyframes accept a list of locators
  - Spawning conditions support `isPokeSnack`
  - Species behaviour supports `freezeImmune`, and `blockInteract` now documents its fields, including `immuneToCobwebBlock`
  - Species behaviour blocks now reject unknown keys, which Cobblemon silently ignores
    - Removed `walking` and `sleepChance`, which are not real fields
    - `_comment` is allowed on every behaviour block
  - Bait effects now require `value`, which Cobblemon has always required
  - Added `COBBLEMON_DATA_ISSUES.md` documenting the issues these rules found in Cobblemon's own data
- Add schemas for the data folders introduced in Cobblemon 1.8.0
  - `tms`
  - `habitat_pools`
  - `moveset_builders`
  - `party_pools` and `party_compositions`, used by the new `composed_pool` NPC party provider
  - `move_weights.json`
- Add a schema for `spawning/best-spawner-config.json`, which replaced its `buckets` list with separate world, fishing, habitat, and poke snack bucket weights

# 0.10.1

- Update dialogue schema to support expressions in input option text

# 0.10.0

- Add Ability builder form
- Add Ability TypeScript validation support
  - Enable via the `useTypescriptForAbilities` setting to get types and autocomplete
  - Use "Package Addon Zip" to convert TS abilities to JS before loading into Cobblemon
  - `.js` ability files will show VSCode errors since the bare object format isn't valid JS syntax
- Add "Convert to TypeScript" command for JS ability and move files
  - Rewrites the active `.js` file to a `.ts` file with the correct import and `satisfies` wrapper
  - Automatically creates the workspace type definitions file if it doesn't exist
- Add command for installing types without generating a move or ability
- `num` is now optional on both moves and abilities
- Add quick fix code action for missing lang key diagnostics
  - Adds the missing key (with an empty value) to all existing `assets/*/lang/*.json` files

# 0.9.0

- Add icon
- Move builder now adds default move name and description lang keys
- Move validation now warns on missing move lang keys
- Bedrock poser validation now detects legacy `bedrock(group, animation)` references
  - Warns when the animation group file is missing
  - Warns when the expected `animation.<group>.<animation>` key is missing from the animation file
- Edited some validation text to be more human readable
- Fixed egg group validation

# 0.8.0 - 2026-03-26

- Workspace validation now covers custom move files
- Move builder supports JS by default with optional TS generation
- Added move callback snippets and insert callback command
- Added `pack.mcmeta` generation and validation
- Added addon zip packaging command
  - TS move files are converted to packaged JS move files when zipping
- Egg Groups are now validated on lower-case variants

# 0.7.0 - 2026-03-19

- Resolver and poser filepath dex_name convention is now a warning
  - There is an option to disable this warning
- EV Yields no longer require every stat present
- Egg groups are now limited to the supported egg groups
- Extension is now bundled properly

# 0.6.0 - 2026-03-18

- Removed `cannotDynamax` from species sechema

# 0.5.0 - 2026-03-18

- Added `cannotDynamax` to species schema

# 0.4.0 - 2026-03-17

- Added dex entry id validation to dex_entry_addition s

# 0.3.0 - 2026-03-17

- Cobblemon's species and all resources are now present to be validated against
- variations and forms are optional in dex_entry_additions
- evolutions and aspects are optional in species

# 0.2.0 - 2026-03-04

- Reorganize pokemon builder form
- Remove namespace form pokemon builder form
