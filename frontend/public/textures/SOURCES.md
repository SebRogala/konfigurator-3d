# Texture sources

Licences and resolutions differ per asset; each row states its own. The CC0 scans (ambientCG, Poly Haven) have colour maps at 2048 px and normal (OpenGL) and roughness maps downscaled to 1024 px; `oak-rustic` is described in its row.
Shipped as WebP tiers built by `frontend/scripts/perf-check/texture-variants.py` from the original JPEGs in `frontend/assets-src/textures/` (not served): `color.webp` (desktop), `color-1k.webp` (phones), `normal.webp`, `roughness.webp`, `low/*.webp` (256 px first frame), `studio_small_09_256.hdr` (first-frame HDRI) and `studio_small_09_512.hdr` (phone HDRI), both box-averaged from the 1k file.

| Folder / file | Asset id | URL | Licence |
|---|---|---|---|
| `oak-rustic/` | — | AI-generated for this project by the repository author; licensed with the repository (MIT). Rotated 90° (grain along u), graded darker/browner; normal and roughness maps derived from its luminance. | MIT |
| `oak-light/` (also the fine grain of colour fronts) | ambientCG Wood049 | https://ambientcg.com/view?id=Wood049 | CC0 1.0 |
| `walnut/` | ambientCG Wood067 | https://ambientcg.com/view?id=Wood067 | CC0 1.0 |
| `studio_small_09_1k.hdr` | Poly Haven studio_small_09 (1k HDR) | https://polyhaven.com/a/studio_small_09 | CC0 1.0 |
