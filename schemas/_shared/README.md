# Shared Definitions

Primary index: `common.schema.json`

`common.schema.json` is now a compatibility index only. Each `$defs` entry points at a grouped schema file in `defs/`.

Grouped shared definition files:
- `defs/identifiers.schema.json`: non-empty strings, resource locations, identifiers, tag identifiers
- `defs/expressions.schema.json`: boolean-like, expression-like, action list
- `defs/ranges.schema.json`: int range string/range, integer and number min-max objects
- `defs/vectors.schema.json`: vec3 and positioning
- `defs/collections.schema.json`: common list/map containers
- `defs/pokemon.schema.json`: pokemon properties and registry-like predicates
- `defs/drops.schema.json`: drop entry and drop table
- `defs/spawning.schema.json`: spawning condition and weight multiplier
- `defs/npc.schema.json`: variable definition
- `defs/ride.schema.json`: seat offset and seat
