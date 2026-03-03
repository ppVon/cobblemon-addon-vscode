# Marks Schema

Schema: `schema.json`

Use for files in `data/cobblemon/marks/*.json`.

Key fields:
- `name`, `description`, `texture`: required mark metadata.
- `title` + `titleColor`/`titleColour`: ribbon title text/color.
- `group`, `chance`, `indexNumber`: rolling/grouping metadata.
- `replace`: marks this one can replace.

Common pitfalls:
- Missing texture.
- Negative `chance` or `indexNumber`.
