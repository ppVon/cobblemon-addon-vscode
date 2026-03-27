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
