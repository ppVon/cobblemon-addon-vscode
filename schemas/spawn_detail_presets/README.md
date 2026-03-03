# Spawn Detail Presets Schema

Schema: `schema.json`

Use for files in `data/cobblemon/spawn_detail_presets/*.json`.

Key fields:
- `type`: `basic` or `pokemon` preset.
- `bucket`, `spawnDetailType`, `spawnablePositionType`/`context`.
- `condition` / `anticondition`: merged spawning conditions.
- `weightMultipliers`, `weight`, `percentage`, `mergeMode`.
- `pokemon`, `levelRange` for pokemon presets.

Common pitfalls:
- Wrong spawn position type names.
- Invalid condition field names/types.
