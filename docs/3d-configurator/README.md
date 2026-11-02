# 3D configurator — knowledge index

This folder is the normative source for the 3D configurator's stack, conventions and scope.
Each decision lives in exactly one file below. Other files and agents reference that file instead of restating the decision.

## Read order

1. This file — the open questions.
2. [scope.md](scope.md) — stages, the target product, what the configurator must change.
3. [stack.md](stack.md) — libraries and the frontend/backend split.
4. [conventions.md](conventions.md) — units, language, geometry, textures, pricing model and pricing data.
5. [ui-pattern.md](ui-pattern.md) — the step-and-selection UI pattern and the cabinet steps.
6. [architecture.md](architecture.md) — modules, their boundaries, homes for upcoming work, and architecture decisions.
7. [gotchas.md](gotchas.md) — verified three.js / React Three Fiber rules by area; [gotchas-sources.md](gotchas-sources.md) holds their sources and the rules still to verify.

## Open questions

| Question | Status |
|---|---|
| Size step values and every surcharge amount | decided for the mockup — mock values live in `frontend/src/catalog/catalog.ts`; real prices arrive with the backend |
| How stage 2 stores the surcharge catalog in Medusa | open — options and the proposed pricing approach are in [architecture.md](architecture.md) § "Decisions" |
