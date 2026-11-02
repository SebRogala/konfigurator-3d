# 3D configurator — knowledge index

This folder is the normative source for the 3D configurator's stack, conventions and scope.
Each decision lives in exactly one file below. Other files and agents reference that file instead of restating the decision.

## Read order

1. This file — the open questions.
2. [scope.md](scope.md) — stages, the target product, what the configurator must change.
3. [stack.md](stack.md) — libraries and the frontend/backend split.
4. [conventions.md](conventions.md) — units, language, geometry, textures, pricing model and pricing data.
5. [ui-pattern.md](ui-pattern.md) — the step-and-selection UI pattern and the proposed cabinet steps.
6. [gotchas.md](gotchas.md) — verified three.js / React Three Fiber rules by area; [gotchas-sources.md](gotchas-sources.md) holds their sources and the rules still to verify.

## Open questions

| Question | Status |
|---|---|
| Deadline for stage 1 | open — unknown |
| Size step values and every surcharge amount | open — the pricing model is decided in [conventions.md](conventions.md); the numbers are not |
| How stage 2 maps the surcharge price file to Medusa (e.g. custom line-item pricing) | open |
| Final cabinet step list | open — [ui-pattern.md](ui-pattern.md) holds a proposal the Operator may edit |
