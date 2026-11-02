# konfigurator-3d



## Commands

Run from `frontend/`:

- Setup: `npm install`
- Dev server: `npm run dev` (or `docker compose up -d` from the repo root, see `DEPLOY.md`)
- Lint: `npm run lint`
- Done means: `npm run build` and `npm run lint` pass.

## Where to look

| When you touch                                                      | Read first                                                                                                              |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| anything in the 3D configurator: stack, scope, pricing, UI, 3D code | `.private/docs/README.md` when present (local context; it links the public docs), else `docs/3d-configurator/README.md` |

## Task files

When `.private/tasks/` exists, it holds the current work:

- `*-epic.md` — scope in tiers, the reference to match, acceptance. Start any stage work by reading the open epic; deliver only its approved tier; record actual time in its "Tracking" section when a tier lands.
- `briefs/` — one brief per work item (boot reads, goal, file ownership, done-when, hand-off) plus the reviewer brief. A session handed a brief reads it in full and follows its boot reads first.
- `reviews/` — work-item reports, review rounds (`<wi>-review-r<N>.md`) and screenshots.

## Specialists

Local-only definitions under `.agents/agents/`, when present, run as sub-agents.

| Name             | Use when                                                                          | Definition                           |
| ---------------- | --------------------------------------------------------------------------------- | ------------------------------------ |
| web-3d-developer | building or changing 3D scenes, geometry, materials, lighting, render performance | `.agents/agents/web-3d-developer.md` |
