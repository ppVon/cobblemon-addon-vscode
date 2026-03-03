# Spawn Pool World Schema

Schema: `schema.json`

Use for files in `data/cobblemon/spawn_pool_world/*.json`.

Key fields:
- `enabled`, mod dependency lists.
- `spawns`: list of spawn details (`pokemon`, `pokemon-herd`, `npc`).
- supports aliases used by loaders:
  - `preset` or `presets`
  - `condition` or `conditions`
  - `anticondition` or `anticonditions`
  - `weightMultiplier` or `weightMultipliers`

Type notes:
- `pokemon`: `pokemon` + `level`/`levelRange`.
- `pokemon-herd`: `herdablePokemon` + herd settings.
- `npc`: one of `npcClass`, `class`, or `npc`.
- `timeRange` supports numeric ranges and named windows (`day`, `night`, `dawn`, `dusk`, `twilight`).

Common pitfalls:
- Missing `bucket` or `weight`.
- Using condition aliases incorrectly (object vs list).
