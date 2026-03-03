# Action Effects Schema

Schema: `schema.json`

Use for files in `data/cobblemon/action_effects/*.json`.

Key fields:
- `timeline`: ordered keyframes to run.
- `condition`: optional MoLang/expression gate for the whole timeline.
- keyframe `type`: effect node type (animation, sound, pause, sequence, etc).
- keyframe `keyframes`: nested keyframes for composite nodes (`sequence`, `parallel`, `fork`).

Common pitfalls:
- Missing `timeline`.
- Object keyframes without `type`.
