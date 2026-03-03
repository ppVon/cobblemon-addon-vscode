# Species Additions Schema

Schema: `schema.json`

Use for files in `data/cobblemon/species_additions/*.json`.

Key fields:
- `target`: species id to patch.
- any additional properties are treated as species property overrides/merges.

Notes:
- At least one extra property besides `target` is required.
- Property names should match mutable `Species` fields in code.
