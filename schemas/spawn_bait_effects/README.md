# Spawn Bait Effects Schema

Schema: `schema.json`

Use for files in `data/cobblemon/spawn_bait_effects/*.json`.

Key fields:
- `item`: bait item id.
- `effects`: effect list (`type`, `chance`, optional `subcategory`, optional `value`).

Common pitfalls:
- Missing `chance`.
- Using invalid numeric values for chance.
