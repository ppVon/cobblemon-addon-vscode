# Bedrock Poser Schema

Schema: `schema.json`

Use for poser JSON files in:
- `assets/<namespace>/bedrock/pokemon/posers/**.json`
- `assets/<namespace>/bedrock/npcs/posers/**.json`
- `assets/<namespace>/bedrock/fossils/posers/**.json`
- `assets/<namespace>/bedrock/block_entities/posers/**.json`
- `assets/<namespace>/bedrock/generic/posers/**.json`
- `assets/<namespace>/bedrock/poke_balls/posers/**.json`

Purpose:
- validate pose declarations, animation references, transition definitions, and transformed parts

Key fields:
- `poses` object (required)
- optional top-level animation map (`animations`), camera offsets, scales/translations, and model properties

Pose fields:
- `poseTypes` or `allPoseTypes`
- optional `condition` / `conditions`
- `animations`, `namedAnimations`, `transitions`, `quirks`, `transformedParts`

Common pitfalls:
- missing `poses`
- transformed part entries missing `part`
- invalid `poseTypes` enum values
- malformed animation object entries missing `animation`
