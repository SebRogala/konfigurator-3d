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

Use real PBR wood textures from CC0 sources: ambientCG (https://ambientcg.com) or Poly Haven (https://polyhaven.com).
Use no generic flat colour for a wood surface in the stage 1 mockup. A front surface may be a coloured physical material when it carries a normal or roughness map. A flat colour is acceptable in stage 0.

## Pricing model

Decided by the Operator. Compute the total as the base price plus the flat surcharge of each selected option's group.
One group carries one surcharge; every option inside that group costs the same. A 0 zł group is valid.

Price sizes as fixed size steps, each with its own surcharge. This is the Operator's default for size pricing and stays revisable.

## Pricing data

In stages 0 and 1, prices are mocked:

1. Keep every mocked price in one data file.
2. Shape that file on the pricing model above: one base price, plus a list of option groups. Each group holds a flat surcharge and its options.
3. Compute the total with one pure function that reads that file and the current configuration.
4. Read prices in components only through that function. Components hard-code no price.

Stage 2 replaces the data source with the Medusa API. The pure function and the components stay unchanged.
How stage 2 maps this shape to Medusa (for example, custom line-item pricing) is an open question in [README.md](README.md).
