# Species Schema

Schema: `schema.json`

Use for files in `data/cobblemon/species/**/*.json`.

Coverage focus:
- Core species stats and metadata.
- Behaviour blocks (resting/moving/combat/herd/etc).
- Evolutions and evolution requirements.
- Forms with per-form overrides.
- Riding data (`seats`, `stats`, behaviour config).
- Drops, features, pokedex data, and lighting data.

Common pitfalls:
- Missing required top-level fields (`evolutions`, `behaviour`, `baseStats`, etc).
- Invalid evolution `variant` values.
- Riding stat ranges formatted incorrectly.
