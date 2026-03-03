# Berries Schema

Schema: `schema.json`

Use for files in `data/cobblemon/berries/*.json`.

Key fields:
- `baseYield`, `growthTime`, `refreshRate`: min/max ranges.
- `growthFactors`: yield modifiers by factor variant.
- `spawnConditions`: grove spawning rules.
- `growthPoints`, `stageOnePositioning`, `pokeSnackPositionings`: model placement/rotation points.
- `mutations`: map of berry id -> mutation expression.

Common pitfalls:
- Missing required shape/model/texture fields.
- Invalid `variant` values in `growthFactors`/`spawnConditions`.
