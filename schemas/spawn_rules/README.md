# Spawn Rules Schema

Schema: `schema.json`

Use for files in `data/cobblemon/spawn_rules/*.json`.

Key fields:
- `displayName`, `enabled`, `components`.
- component `type`: `weight`, `filter`, `location`.
- selectors support expression shorthand or typed objects.

Common pitfalls:
- `enabled` accidentally stringly typed in custom files (schema allows bool-like, but prefer boolean).
- `weight` component missing `weight` expression.
