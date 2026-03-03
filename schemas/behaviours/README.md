# Behaviours Schema

Schema: `schema.json`

Use for files in `data/cobblemon/behaviours/*.json`.

Key fields:
- `configurations`: behaviour config blocks (required).
- `onAdd` / `onRemove` / `undo`: scripts/actions run when attached/removed.
- config `tasksByPriority`: map of priority number -> task list.
- config `variables`: configurable variables shown in tooling/UI.

Common pitfalls:
- `tasksByPriority` keys must be numeric strings (`"0"`, `"1"`, ...).
- Forgetting config `type` for object configs.
