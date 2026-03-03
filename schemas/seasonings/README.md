# Seasonings Schema

Schema: `schema.json`

Use for files in `data/cobblemon/seasonings/*.json`.

Key fields:
- `ingredient`: item id for the seasoning.
- `colour`/`color`: display color.
- `food`: hunger/saturation overrides.
- `mobEffects`: potion effects applied by this seasoning.
- optional `flavours` and `baitEffects`.

Common pitfalls:
- Missing both `colour` and `color`.
- Incomplete mob effect entries.
