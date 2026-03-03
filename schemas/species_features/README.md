# Species Features Schema

Schema: `schema.json`

Use for files in `data/cobblemon/species_features/*.json`.

Provider types:
- `choice`: fixed string choice list.
- `flag`: boolean feature.
- `integer`: bounded integer feature.

Shared fields:
- `keys`: feature property names this provider serves.
- `default`: default value used when absent.
- `visible`: show in UI/tooling.

Type-specific fields:
- `choice`: `choices`, `isAspect`, `aspectFormat`.
- `integer`: `min`, `max`, optional `display`, optional `itemPoints`.

Common pitfalls:
- Missing `keys`.
- `integer` without `min`/`max`.
