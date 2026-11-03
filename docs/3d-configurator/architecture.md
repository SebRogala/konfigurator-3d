# Architecture

## Modules as built

All paths are under `frontend/src/`.

| Module | Holds | May import |
|---|---|---|
| `contract/` | `cabinet.ts`: `ResolvedCabinet` and its keys (`WoodKey`, `FrontFinish`, `SectionSplit`, `GlazedSection`, `GlassKey`, `HandleKey`), the configuration seam. `sceneControls.ts`: `SceneControls` and `SceneViewProps`, the view seam | React types only |
| `model/` | the `Catalog` type, `FIELD_IDS` (range and option fields), `Selection`, range arithmetic (`range.ts`), rules (`isFieldActive`), `resolveCabinet`, `totalPrice` / `priceLines` | `contract/` only; no React, no three.js, no I/O |
| `catalog/` | `MOCK_CATALOG`: data only, one `Catalog` value | `contract/` and `model/` types |
| `ui/` | header, steps, swatches, range inputs, summary, the "Sterowanie" viewer panel (`ViewerControls`); `STEPS` (which fields each step shows) | `model/`, `contract/` types |
| `scene/` | layout (carcass boxes and door units), animated doors (`Door.tsx`), geometry, materials, camera, lighting | `contract/` only |
| `App.tsx`, `main.tsx` | wiring: `main.tsx` passes the catalog to `App` as a prop | all of the above |

Keep these boundaries:

- Render the scene from a `ResolvedCabinet`. The scene knows no prices and no option ids.
- Pass view state to the scene only through `contract/sceneControls.ts`: `doorsOpen` as a prop, and the `SceneControls` handle (`setView`, `snapshot`) through `controlsRef`. View state never enters `Selection`, the URL or the price.
- Pass the catalog into the model functions and components as an argument. No module imports the mock catalog except `main.tsx`.
- Keep `model/` pure, so a backend can reuse `totalPrice` to validate a price.

The pricing model and the price-data rules live in [conventions.md](conventions.md).

## Prescribed homes for upcoming work

| Work | Home | Notes |
|---|---|---|
| Tolerant selection parsing | `model/` — `parseSelection(catalog, raw)` | Falls back to the default per field on an unknown id. `findChoice` stays strict as an internal invariant. |
| Catalog source swap | `catalog/source.ts` — `loadCatalog(): Promise<Catalog>`, with `mock.ts` and `medusa.ts` | `App` awaits it; the scene stays untouched. |
| LED in the glazed section | catalog field `led` in the Akcesoria step; `ResolvedCabinet.led: boolean`; `layout.lights[]`; new `scene/VitrineLight.tsx` | See the decisions below. |
| Configuration in the URL | `state/selectionUrl.ts` (pure encode/decode, `node:test`); `state/useSelection.ts` replaces `useState` in `App` | Decodes through `parseSelection`. |
| Stage 2: base product | a Medusa product with one variant; its native price is the base price | |
| Stage 2: surcharge groups and options | either a custom module `backend/src/modules/configurator/` with `GET /store/configurator/catalog`, or product `metadata` JSON validated by the shared schema | Open; see the decisions below. |
| Stage 2: add to cart with a server price | route `backend/src/api/store/carts/[id]/configured-items/route.ts`; workflow `backend/src/workflows/add-configured-cabinet.ts` | Validates the selection, computes base + surcharges on the server, calls `addToCartWorkflow` with `unit_price` and `metadata.selection`. The client sends no price. |
| Stage 2: cart UI | `frontend/src/commerce/` | The header total stays a preview. |
| Stage 2: deploy | `backend` service on the `infra` network in the root compose file; a second Coolify app with base directory `/backend` | The frontend gets the Medusa URL and publishable key at build time. |

Built since the plan: door units in `scene/layout.ts` (`DoorUnit`), animated by `scene/Door.tsx`; the open state comes from the "Sterowanie" panel through the view seam.

## Decisions

Decided by the Operator, 2026-11-03:

- Build `parseSelection` in the home above, as part of the tier 2 URL work.
- Make LED lighting a priced option in the Akcesoria step: a flat surcharge, active only when a section is glazed.
- Encode the configuration in the URL as readable query params (for example `?w=1100&front=black`), decoded through `parseSelection`.
- Start the shared model as `frontend/src/model/`. Revisit this in stage 2.

Proposed, not decided: in stage 2, price a configured cabinet as a custom line item through a Medusa workflow, rather than one variant per combination or price lists.
Why: it is the only option that keeps the surcharge model, and the same `totalPrice` validates the price on the server.
Risk: whether Medusa re-prices a custom line item later in the cart is unverified. Guard cart completion by recomputing the price from `metadata.selection`.

Open:

- Surcharge catalog in a custom Medusa module (editable in the admin, more code) or in product metadata JSON (smallest).
- Shared model as an npm workspace package, or a frontend folder the backend copies at build time. A workspace needs the repo root as the build context.
