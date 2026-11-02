# Gotchas — three.js, React Three Fiber, drei

Verified rules only: each comes from official docs, a community thread read during research, or a failure reproduced in this project.
Sources per rule id, and the rules still to verify, are in [gotchas-sources.md](gotchas-sources.md).
The installed library versions are in `frontend/package.json`.
Each rule carries a tag: the stage it applies from, and the trigger that makes it relevant.

## Geometry

- **G1** `stage 1 · building the carcass` Give each panel its own box mesh; merge panels only when draw calls are a measured problem.
  Why: a 2-section cabinet is about 20–40 meshes, far below a budget of a few hundred draw calls.
- **G2** `stage 0 · a size control` Debounce slider input, or write positions in place, when `<boxGeometry args>` changes.
  Why: R3F rebuilds the object from scratch whenever `args` change.
- **G3** `stage 1 · rounded edges` Use drei RoundedBox with a radius of about 0.5–1 mm on fronts and tops only, and check its UVs.
  Why: real panels catch a highlight on a broken edge; drei does not document RoundedBox's UV layout.
- **G4** `stage 1 · joining panels` Build carcass joints as butt joints, and leave a 0.1–0.5 mm gap between door and carcass.
  Why: touching or overlapping coplanar faces z-fight.
- **G5** `stage 0 · camera setup` Keep camera near/far tight (for example 0.05 / 20 for a 2 m object) before trying polygonOffset or logarithmicDepthBuffer.
  Why: z-fighting comes mostly from a wide depth range; R3F's default is 0.1 / 1000.

## Textures and materials

- **G6** `stage 1 · per-panel texture transform` Clone a texture from `useTexture` before you change its `repeat`, `offset` or `rotation`.
  Why: `useTexture` caches by URL, so one mutation hits every panel that uses it.
- **G7** `stage 1 · loading any colour map` Set colour space on texture maps yourself under R3F v9.
  Why: R3F v9 removed automatic sRGB conversion of texture props.
- **G8** `stage 1 · glass` Make a pane with only opaque objects behind it `MeshPhysicalMaterial` with `transmission: 1, opacity: 1, thickness: ~0.004, ior: 1.5`. Make a pane with a transparent object behind it (a door in front of a glass shelf) `transparent` with low opacity instead.
  Why: opacity-only glass loses reflectivity, but a transmissive pane leaves transparent objects behind it out of its render, which hid the glass shelf here.
- **G9** `stage 1 · glass` Use MeshPhysicalMaterial transmission for flat clear glass, not drei `MeshTransmissionMaterial`.
  Why: its blur and chromatic aberration add nothing to a flat pane and still cost an extra pass.
- **G10** `stage 1 · textures on tops and shelves` Set `texture.anisotropy = gl.capabilities.getMaxAnisotropy()` on directional maps.
  Why: surfaces seen at grazing angles go blurry and grey without anisotropy.
- **G26** `stage 1 · any useTexture caller` Configure textures from drei `useTexture` after the hook returns (in a `useMemo`), not in its `onLoad` callback.
  Why: `onLoad` does not run when the URLs are already cached, so a second caller's textures stayed `ClampToEdge` without sRGB, smearing UVs outside 0–1 and paling the wood.
- **G11** `stage 1 · texture compression` Encode KTX2 colour maps as ETC1S and normal maps as UASTC, with a self-hosted Basis transcoder.
  Why: ETC1S mangles normal maps.

## Lighting and camera

- **G12** `stage 1 · colour accuracy` Set `gl={{ toneMapping: THREE.NeutralToneMapping }}` instead of R3F's default ACESFilmic.
  Why: ACES shifts hue and saturation; Khronos PBR Neutral targets true-to-life product colour.
- **G13** `stage 1 · environment lighting` Self-host a 1k–2k studio HDRI through `<Environment files=...>`.
  Why: drei presets fetch from a CDN, and the drei docs say they are not meant for production.
- **G14** `stage 1 · dark or glossy fronts` Add `<Lightformer>` softboxes inside `<Environment frames={1}>`.
  Why: dark fronts look flat when nothing bright is there to reflect.
- **G15** `stage 1 · grounding the object` Ground the object with a soft shadow that follows its footprint and updates when a dimension changes. On the installed versions, use the blurred canvas-texture plane in `frontend/src/scene/FootprintShadow.tsx`.
  Why: a floating object reads as fake. drei `ContactShadows` drew nothing on the installed versions, even with a red shadow colour.
- **G16** `stage 1 · a dimension change` Re-frame with CameraControls `fitToBox(box, true)` on slider release, not on every tick.
  Why: refitting on every tick makes the view swim.
- **G17** `stage 0 · orbit controls` Limit polar angles, azimuth (about ±100°) and distance.
  Why: the unfinished back and underside are where the illusion breaks.

## Performance

- **G18** `stage 0 · frameloop="demand"` Call `invalidate()` after every imperative change, and keep calling it while CameraControls `update()` returns true.
  Why: demand mode renders only on invalidation, so damping freezes mid-motion otherwise.
- **G19** `stage 1 · mobile` Cap `dpr={[1, 1.5]}` and add `<PerformanceMonitor>` with `flipflops` and `onFallback`.
  Why: a DPR 3 phone renders 9× the pixels, and transmission and shadows cost per pixel.
- **G20** `stage 1 · shared assets` Add `dispose={null}` to cached and shared resources; dispose imperatively created ones in a `useEffect` cleanup.
  Why: R3F auto-disposes JSX objects on unmount, shared assets included.
- **G21** `stage 1 · option variants` Toggle `visible` on heavy subtrees instead of mounting them conditionally.
  Why: a remount recompiles shaders and re-uploads buffers.

## React / R3F

- **G22** `stage 0 · useFrame code` Read stores with `getState()` inside `useFrame`, scale every step by `delta`, and allocate vectors outside the loop.
  Why: speed otherwise varies with refresh rate, and per-frame allocation churns the garbage collector.
- **G23** `stage 1 · heavy rebuilds` Wrap rebuilds after a dimension change in `startTransition`.
  Why: the slider UI stays responsive.
- **G24** `stage 0 · dependency upgrades` Keep the drei major matched to R3F, and remove any `<StrictMode>` nested inside `<Canvas>`.
  Why: R3F v9 inherits StrictMode from react-dom, so effects that create GPU resources run twice in development.
- **G25** `stage 0 · a custom renderer` Write it as `gl={(props) => new WebGLRenderer(props)}`.
  Why: the v9 signature no longer receives the canvas.
