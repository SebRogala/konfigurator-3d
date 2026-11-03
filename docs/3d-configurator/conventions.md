# Conventions

## Units

Express every length in the configuration model in millimetres.

## Language and currency

Write all UI text in Polish.
Show every price in PLN, formatted as "4440 zł". This is the `Intl.NumberFormat('pl-PL')` output, which does not group 4-digit numbers [training data].

## Geometry

Build the cabinet parametrically in code from the configuration model.
Width, height and door layout change live in the scene.
Use no fixed GLB for the cabinet.

## Textures

Use real PBR wood textures from CC0 sources (ambientCG, https://ambientcg.com; Poly Haven, https://polyhaven.com), or textures made for this project and licensed with the repository.
Record every texture's origin and licence in `frontend/public/textures/SOURCES.md`.
Use no generic flat colour for a wood surface in the stage 1 mockup. A front surface may be a coloured physical material when it carries a normal or roughness map. A flat colour is acceptable in stage 0.

## Pricing model

Decided by the Operator. Compute the total as the base price plus one surcharge per active field:

- A range field (width, height) costs a flat rate per step above its minimum. A value must sit on a step inside the range.
- An option field (section split, body, fronts, glazing, glass, handles) costs the flat surcharge of the selected option's group. One group carries one surcharge; every option inside that group costs the same. A 0 zł group is valid.

A field that does not apply adds nothing; `frontend/src/model/rules.ts` (`isFieldActive`) decides which fields apply.

## Pricing data

In stages 0 and 1, prices are mocked:

1. Keep every mocked price in one data file: `frontend/src/catalog/catalog.ts` (`MOCK_CATALOG`).
2. Shape that data as the `Catalog` type in `frontend/src/model/catalog.ts`: one base price, range fields (`RangeField`: min, max, step and rate per step), and option fields whose groups each hold a flat surcharge and their options. The range arithmetic is in `frontend/src/model/range.ts`.
3. Compute the total with the pure `totalPrice(catalog, selection)` in `frontend/src/model/pricing.ts`. `priceLines` in the same file gives the per-field lines that `totalPrice` sums.
4. Read prices in components only through those functions, with the catalog passed in as an argument. Components hard-code no price.

Stage 2 replaces the catalog source with the Medusa API. The model functions and the components stay unchanged.
The source-swap home and the Medusa mapping are in [architecture.md](architecture.md).
