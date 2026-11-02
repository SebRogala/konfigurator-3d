# Gotchas — sources and rules to verify

Tags: [doc] official docs read during research · [forum] community thread read during research · [training] model training data, not re-checked · [unverified] inferred, no source found · [observed] reproduced in this project's code.

## Sources for the rules in gotchas.md

| Rule | Source |
|---|---|
| G1, G6 | https://r3f.docs.pmnd.rs/advanced/scaling-performance [doc]; G6 also https://github.com/mrdoob/three.js/issues/5821 [forum, old] |
| G2, G20 | https://r3f.docs.pmnd.rs/api/objects [doc] |
| G3 | https://drei.docs.pmnd.rs/shapes/rounded-box [doc] |
| G4 | https://discourse.threejs.org/t/fix-z-fighting-issues/13506 [forum] |
| G5 | the G4 thread [forum]; https://r3f.docs.pmnd.rs/api/canvas [doc] |
| G7, G24, G25 | https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide [doc] |
| G8 | https://threejs.org/docs/pages/MeshPhysicalMaterial.html [doc]; https://discourse.threejs.org/t/transmission-effect-pbr-material-performance/59274 [forum]; the shelf hidden behind a transmissive door, `frontend/src/scene/materials.ts` (door glass) [observed] |
| G9 | https://drei.docs.pmnd.rs/shaders/mesh-transmission-material [doc]; https://discourse.threejs.org/t/meshtransmissionmaterial-poor-performances-urgent/68566 [forum] |
| G10 | https://discourse.threejs.org/t/how-can-i-increase-texture-sharpness/204 [forum] |
| G11 | https://github.com/klich3/threejs-gltf-with-compressions-sample ; https://forum.babylonjs.com/t/how-to-use-ktx2-basis-compressed-normals/16021 [forum] |
| G12 | https://www.khronos.org/news/press/khronos-pbr-neutral-tone-mapper-released-for-true-to-life-color-rendering-of-3d-products ; https://r3f.docs.pmnd.rs/api/canvas [doc] |
| G13, G14 | https://drei.docs.pmnd.rs/staging/environment [doc] |
| G15 | https://drei.docs.pmnd.rs/staging/contact-shadows ; https://drei.docs.pmnd.rs/staging/accumulative-shadows [doc]; ContactShadows rendering nothing on three 0.187 / drei 10.7.9, `frontend/src/scene/FootprintShadow.tsx` [observed] |
| G16 | https://github.com/yomotsu/camera-controls ; https://drei.docs.pmnd.rs/staging/bounds [doc] |
| G17, G18 | https://github.com/yomotsu/camera-controls [doc]; G18 also https://r3f.docs.pmnd.rs/advanced/scaling-performance [doc] |
| G19 | https://r3f.docs.pmnd.rs/advanced/scaling-performance ; https://r3f.docs.pmnd.rs/api/canvas [doc] |
| G21, G22, G23 | https://r3f.docs.pmnd.rs/advanced/pitfalls [doc] |
| G26 | `frontend/src/scene/materials.ts` (`useWoodMaps`), drei 10.7.9 [observed] |

Details inside verified rules that are not verified themselves:

- G6: since r138 the cloned texture's image is shared through `Source` and uploads once [training].
- G12: three exposes `NeutralToneMapping` from r162 [training].
- G13: `environmentIntensity` needs three ≥ 0.163 [doc, version not re-checked].
- G14: the Lightformer details are not on the drei Environment page [training].
- G18: whether drei's CameraControls wrapper already invalidates during damping [unverified].

## Verify before applying

Check each item against a source before you apply it. When the source confirms it, move it to gotchas.md with a new id.

- Generate panel UVs in real-world units (u = length_m / textureWorldSize_m) instead of scaling a unit box. [unverified]
- Set grain direction per panel by swapping u/v in the generated UVs, or `rotation = Math.PI/2` with `center.set(.5,.5)` on a clone. [training]
- Give the 4 thin edge faces an "edge band" material through BoxGeometry's 6 material groups (+x, -x, +y, -y, +z, -z). [training]
- Render black fronts with base colour #111–#1a1a1a and roughness 0.35–0.6; add clearcoat for lacquer only. Clearcoat behaviour: https://threejs.org/docs/pages/MeshPhysicalMaterial.html [doc]; values [training]
- Use the CC0 set's AO map; from r151 `aoMap` can use the main UV channel via `texture.channel`. [training]
- Use 1k wood maps on phones and 2k on desktop; skip metalness, displacement and height maps. [training]
- Pre-warm shader variants with `gl.compile(scene, camera)` before the first interaction. [training]
- Dispose of resources in effect cleanups under HMR (fast refresh), and keep module-level singletons out of component files. [unverified]
- Give the Canvas parent explicit dimensions; a 0-height parent renders nothing. [training]
- Hinge a door in a `<group>` whose origin sits on the hinge axis; cap opening at about 95–110°. Animation approach: https://r3f.docs.pmnd.rs/advanced/pitfalls [doc]; pivot [training]
- Take a snapshot with `gl.render(scene, camera)` then `toDataURL()` in the same tick, with `preserveDrawingBuffer` off. https://discourse.threejs.org/t/saving-out-high-resolution-screenshot-of-scene-with-react-three-fiber/69477 [forum]; exact sequence [unverified]
- Feed the 3D model, the price calculation and the stage 2 Medusa metadata from the one millimetre configuration model in [conventions.md](conventions.md). [unverified]
- Accept only the size steps in [conventions.md](conventions.md) § "Pricing model"; in stage 2 validate the chosen step server-side in Medusa. [unverified]
- Handle `webglcontextlost` by showing a static product image. [training]
- Compare renders against real product photos under the same HDRI; tune roughness and grain scale until they match. [unverified]
