# Dex Entries Schema

Schema: `schema.json`

Use for files in `data/cobblemon/dex_entries/*.json`.

Key fields:
- `id`: dex entry id.
- `speciesId`: target species id.
- `displayAspects` / `conditionAspects`: aspects shown and required.
- `forms`: display/unlock form mappings.
- `variations`: cosmetic variation metadata.

Common pitfalls:
- Missing form `unlockForms` list.
- `variations` entries missing icon/aspects.
