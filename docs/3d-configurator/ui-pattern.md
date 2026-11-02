# UI pattern

Decided by the Operator: the configurator uses a step-and-selection pattern.

- A sticky header holds the live total price and a summary button.
- The steps are numbered, collapsible accordion sections.
- Inside a step, options sit in groups. Each group shows its flat surcharge next to the group name, for example "Fronty premium 800 zł".
- Options are swatch tiles. The selected tile has an outline. The selected option's name appears under the group title.

How the surcharges add up to the total is in [conventions.md](conventions.md) § "Pricing model".

## Cabinet steps

Proposal: the Operator may edit this list. It fits the [target product](scope.md#target-product).

| # | Step | Content |
|---|---|---|
| 1 | Wymiary | width and height, as size steps |
| 2 | Korpus | body finish tiers |
| 3 | Fronty | front colour tiers: standard, premium, wood veneer |
| 4 | Przeszklenie | glazed door on or off, and the glass type |
| 5 | Uchwyty | handles |
| 6 | Akcesoria | for example LED lighting, an extra glass shelf |
