# Scope

## Stages

| Stage | Deliverable | Done when |
|---|---|---|
| 0 — bare POC | A box with changeable size and colour. | The toolchain renders it in a browser and the controls change it live. |
| 1 — mockup (current target) | The cabinet configurator with mocked prices and a few real textures. | The target product configures live, with a live total and a summary panel. |
| 2 — later | Integration with the Medusa.js backend. | Prices and options come from the Medusa API. |

Limit stage 0 and stage 1 code to the configurator, the mocked price data and the summary panel. Write the e-commerce code (cart, checkout, backend calls) in stage 2.

## What the configurator must change

Change geometry, not only textures. The minimum set:

- cabinet width
- cabinet height
- which door is glazed

Material and colour options come on top of this set, not instead of it.

## Target product

A 2-section living-room cabinet:

- oak frame and body
- black fronts
- left section: a glass door at the top with a glass shelf behind it, above a solid door
- right section: one tall solid door
- black bar handles
