# Pokemon Interactions Schema

Schema: `schema.json`

Use for files in `data/cobblemon/pokemon_interactions/*.json`.

Key fields:
- top-level `requirements`: set-level requirement gates.
- `interactions`: interaction entries.
- interaction `requirements`: per-interaction requirement gates.
- interaction `effects`: effect list (`drop_item`, `give_item`, `play_sound`, `shrink_item`, `script`).
- `cooldown`: expression controlling cooldown.

Common pitfalls:
- Missing root `target` for `properties`-style set requirements.
- Effect payload not matching effect `variant`.
