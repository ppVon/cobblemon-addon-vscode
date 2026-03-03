# Bedrock Pokemon Resolver Schema

Schema: `schema.json`

Use for files in `assets/<namespace>/bedrock/pokemon/resolvers/**.json`.

Purpose:
- maps a species/model id to ordered variation rules
- each variation can select poser/model/texture/layers based on aspects and optional condition

Key fields:
- `species` (or alternate loader keys `name` / `pokeball`)
- `order`
- `variations[]`
  - `aspects`
  - optional `poser`, `model`, `texture`, `layers`, `sprites`, `condition`

Notes:
- `texture` supports static id strings, `"variable"`, or animated object form (`frames`, `fps`, etc.)
- layer keys follow runtime model layer options (`emissive`, `translucent`, `translucent_cull`, `scrolling`)

Common pitfalls:
- missing `variations`
- malformed resource identifiers for `species`, `poser`, `model`, or textures
- wrong `order` type (must be integer)
