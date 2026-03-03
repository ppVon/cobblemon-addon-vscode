# Cosmetic Items Schema

Schema: `schema.json`

Use for files in `data/cobblemon/cosmetic_items/*.json`.

Key fields:
- `pokemon`: Pokemon property selectors this assignment applies to.
- `cosmeticItems`: unlockable/consumable cosmetic entries.
- `consumedItem` (or `item`): item condition used to apply cosmetic.
- `aspects`: aspects to add.

Common pitfalls:
- Missing `aspects` on a cosmetic entry.
- Missing both `consumedItem` and `item`.
