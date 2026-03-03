# NPC Classes Schema

Schema: `schema.json`

Use for files in `data/cobblemon/npcs/*.json`.

Key fields:
- `presets`: preset ids to apply before this file.
- `names`, `hitbox`, `canDespawn`.
- `interaction`: dialogue/script/custom_script/none (supports shorthand string).
- `party`: `simple`, `pool`, or `script` provider.
- `variation` / `variations`: random/weighted aspect providers.
- `behaviours`/`behaviors`/`ai`: behaviour configs.

Common pitfalls:
- Missing `type` for object-based party/interaction providers.
- Using weighted variation options without `aspect`/`aspects`.
