# Dexes Schema

Schema: `schema.json`

Use for files in `data/cobblemon/dexes/*.json`.

Supported types:
- `cobblemon:simple_pokedex_def`: requires `entries`.
- `cobblemon:aggregate_pokedex_def`: requires `subDexIds` and `squash`.

Common pitfalls:
- Mixing `entries` with aggregate dex type.
- Missing `sortOrder`.
