# Natural Materials Schema

Schema: `schema.json`

Use for files in `data/cobblemon/natural_materials/*.json`.

Root type is an array.

Per entry:
- `content`: weight/quantity value.
- `item` or `tag`: target material condition (at least one required).
- `tag` values use tag syntax like `#c:dyes`.
- `returnItem`: optional item returned after use.

Common pitfalls:
- Using object root instead of array root.
- Missing both `item` and `tag`.
