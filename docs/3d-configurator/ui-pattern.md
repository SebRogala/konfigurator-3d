# UI pattern

Decided by the Operator: the configurator uses a step-and-selection pattern.

- A sticky header holds the live total price and a summary button.
- The steps are numbered, collapsible accordion sections.
- Inside a step, options sit in groups. Each group shows its flat surcharge next to the group name, for example "Fronty premium 800 zł".
- Options are swatch tiles or chips. The selected one has an outline. The selected option's name appears under the group title.
- A dimension is a slider with a numeric box. The box snaps the value to the nearest step inside the range, and the surcharge shows beside the field.

A "Sterowanie" overlay panel on the 3D view holds view-only controls: camera presets (front, 3/4, side), doors open/close, a PNG snapshot, and fullscreen for the whole configurator. These controls change no selection and no price.

How the surcharges add up to the total, and how ranges are priced, is in [conventions.md](conventions.md) § "Pricing model".

## Cabinet steps

Decided: five steps, fitting the [target product](scope.md#target-product). `frontend/src/ui/steps.ts` (`STEPS`) holds them.

| # | Step | Content |
|---|---|---|
| 1 | Wymiary | width and height as range sliders; section split (wide glazed section, or equal sections) |
| 2 | Korpus | body finish tiers |
| 3 | Fronty | front colour tiers: standard, premium, wood veneer |
| 4 | Przeszklenie | glazed door on or off, and the glass type |
| 5 | Uchwyty | handles |

Tier 2 adds a sixth step, Akcesoria, with the LED option described in [architecture.md](architecture.md) § "Decisions".
