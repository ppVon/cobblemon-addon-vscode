# Dialogues Schema

Schema: `schema.json`

Use for files in `data/cobblemon/dialogues/*.json`.

Key fields:
- `speakers`: speaker map (`npc`, `player`, custom ids).
- `pages`: ordered dialogue pages.
- page `lines`: text/expression lines.
- page `input`: input mode (`text`, `auto-continue`, `option`, `none`) or shorthand action.

Common pitfalls:
- Page missing `lines`.
- Option input entries without `text` and `value`.
