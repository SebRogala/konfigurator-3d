// Soft studio floor shadow, baked from the cabinet's underside whenever its geometry changes.
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { DoubleSide, HalfFloatType, Mesh, OrthographicCamera, ShaderMaterial, WebGLRenderTarget, type Material, type Object3D, type Scene, type Texture, type WebGLRenderer } from 'three'
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js'
import type { CabinetLayout } from './layout'
import { PHONE } from './materials'
import { isAnimating } from './motion'

const BAKE_PX = PHONE ? 256 : 512
/** Floor margin around the footprint (m): room for an open door's swing and the penumbra falloff. */
const MARGIN_M = 0.8
/** Height (m) over which a surface stops darkening the floor below it: legs touch, the plinth hovers a few cm up. */
const FADE_HEIGHT_M = 0.25
/** Gaussian sigmas (m): a tight contact core and a broad softbox penumbra. */
const CONTACT_SIGMA_M = 0.018
const PENUMBRA_SIGMA_M = 0.11
const CONTACT_OPACITY = 0.55
const PENUMBRA_OPACITY = 0.28

/** Projects every caster straight down onto the floor square; depth keeps the lowest surface, alpha fades with its height. */
const silhouetteMaterial = (half: number, cx: number, cz: number) =>
  new ShaderMaterial({
    side: DoubleSide,
    uniforms: { halfSize: { value: half }, centre: { value: [cx, cz] }, fade: { value: FADE_HEIGHT_M } },
    vertexShader: /* glsl */ `
      uniform float halfSize; uniform vec2 centre; uniform float fade; varying float vHeight;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vHeight = wp.y;
        gl_Position = vec4((wp.x - centre.x) / halfSize, -(wp.z - centre.y) / halfSize, clamp(wp.y / 4.0, 0.0, 1.0) * 2.0 - 1.0, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float fade; varying float vHeight;
      void main() { gl_FragColor = vec4(1.0 - smoothstep(0.0, fade, vHeight)); }`,
  })

/** One separable Gaussian pass (9 taps, spacing sigma/2 texels). */
const blurMaterial = () =>
  new ShaderMaterial({
    uniforms: { src: { value: null as Texture | null }, step: { value: [0, 0] } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: /* glsl */ `
      uniform sampler2D src; uniform vec2 step; varying vec2 vUv;
      void main() {
        float w[5] = float[](0.2270, 0.1945, 0.1216, 0.0540, 0.0162);
        float s = texture2D(src, vUv).r * w[0];
        for (int i = 1; i < 5; i++) {
          s += texture2D(src, vUv + step * float(i)).r * w[i];
          s += texture2D(src, vUv - step * float(i)).r * w[i];
        }
        gl_FragColor = vec4(s);
      }`,
  })

/** The 9-tap kernel's own sigma, in tap steps: a blur of sigma S uses steps of S / KERNEL_SIGMA_STEPS. */
const KERNEL_SIGMA_STEPS = 1.8
/** Blur resolutions: each keeps its tap step at or under ~1.4 texels, so bilinear taps leave no gaps (no bands). */
const CONTACT_PX = 256
const PENUMBRA_PX = 64

type Passes = { blur: ShaderMaterial; copy: ShaderMaterial; blurQuad: FullScreenQuad; copyQuad: FullScreenQuad }

/** Separable Gaussian of `sigmaTexels` (in `dst` texels) from `src` into `dst` through `scratch` (same size as dst). */
function gaussian(gl: WebGLRenderer, passes: Passes, src: Texture, scratch: WebGLRenderTarget, dst: WebGLRenderTarget, sigmaTexels: number) {
  const step = sigmaTexels / KERNEL_SIGMA_STEPS / dst.width
  for (const [dx, dy, from, to] of [
    [step, 0, src, scratch],
    [0, step, scratch.texture, dst],
  ] as const) {
    passes.blur.uniforms.src.value = from
    passes.blur.uniforms.step.value = [dx, dy]
    gl.setRenderTarget(to)
    passes.blurQuad.render(gl)
  }
}

/** Halves `src` into `dst` (half its size): each bilinear tap lands on a 2×2 corner and averages it exactly. */
function halve(gl: WebGLRenderer, passes: Passes, src: Texture, dst: WebGLRenderTarget) {
  passes.copy.uniforms.src.value = src
  gl.setRenderTarget(dst)
  passes.copyQuad.render(gl)
}

/**
 * The floor shadow: the cabinet's underside (legs, plinth, door bottoms) projected straight down, blurred into a tight
 * contact core plus a broad penumbra, like a softbox-lit studio floor. Baked when the casters change (configuration,
 * door swing), never on camera motion, so orbit frames cost one textured quad. Only shadow-casting (opaque)
 * meshes take part. Drawn from above only, like the rest of the ground.
 */
export function BakedFloorShadow({ layout, doorsOpen }: { layout: CabinetLayout; doorsOpen: boolean }) {
  const invalidate = useThree((s) => s.invalidate)
  const [w, , d] = layout.bounds.size
  const [cx, , cz] = layout.bounds.centre
  const size = Math.max(w, d) + 2 * MARGIN_M
  const targets = useMemo(() => {
    // Half-float blur targets: 8-bit storage stepped the shallow penumbra gradient.
    const t = (px: number) => new WebGLRenderTarget(px, px, { type: HalfFloatType, depthBuffer: false })
    const pyramid: WebGLRenderTarget[] = []
    for (let px = BAKE_PX / 2; px >= PENUMBRA_PX; px /= 2) pyramid.push(t(px))
    return {
      silhouette: new WebGLRenderTarget(BAKE_PX, BAKE_PX, { depthBuffer: true }),
      pyramid,
      contactScratch: t(CONTACT_PX),
      contact: t(CONTACT_PX),
      penumbraScratch: t(PENUMBRA_PX),
      penumbra: t(PENUMBRA_PX),
    }
  }, [])
  const passes = useMemo<Passes>(() => {
    const blur = blurMaterial()
    const copy = new ShaderMaterial({
      uniforms: { src: { value: null as Texture | null } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'uniform sampler2D src; varying vec2 vUv; void main() { gl_FragColor = texture2D(src, vUv); }',
    })
    return { blur, copy, blurQuad: new FullScreenQuad(blur), copyQuad: new FullScreenQuad(copy) }
  }, [])
  const floor = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { contact: { value: targets.contact.texture }, penumbra: { value: targets.penumbra.texture } },
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: /* glsl */ `
          uniform sampler2D contact; uniform sampler2D penumbra; varying vec2 vUv;
          void main() {
            float a = ${CONTACT_OPACITY.toFixed(3)} * texture2D(contact, vUv).r + ${PENUMBRA_OPACITY.toFixed(3)} * texture2D(penumbra, vUv).r;
            gl_FragColor = vec4(0.0, 0.0, 0.0, min(a, 0.85));
          }`,
      }),
    [targets],
  )
  useEffect(
    () => () => {
      Object.values(targets).flat().forEach((t) => t.dispose())
      passes.blur.dispose()
      passes.copy.dispose()
      passes.blurQuad.dispose()
      passes.copyQuad.dispose()
      floor.dispose()
    },
    [targets, passes, floor],
  )

  const dirty = useRef(true)
  const baked = useRef(-1)
  useEffect(() => {
    dirty.current = true
    invalidate()
  }, [w, d, cx, cz, layout, doorsOpen, invalidate])

  const bake = (gl: WebGLRenderer, scene: Scene) => {
    const half = size / 2
    const silhouette = silhouetteMaterial(half, cx, cz)
    // Any camera whose frustum holds the cabinet: the silhouette shader ignores the projection.
    const cull = new OrthographicCamera(-10, 10, 10, -10, -10, 10)
    const hidden: Object3D[] = []
    scene.traverse((o) => {
      if (o instanceof Mesh && o.visible && !o.castShadow) {
        o.visible = false
        hidden.push(o)
      }
    })
    const own = { override: scene.overrideMaterial as Material | null, background: scene.background, target: gl.getRenderTarget(), clear: gl.getClearAlpha() }
    scene.overrideMaterial = silhouette
    scene.background = null
    gl.setRenderTarget(targets.silhouette)
    gl.setClearColor(0x000000, 0)
    gl.clear()
    gl.render(scene, cull)
    scene.overrideMaterial = own.override
    scene.background = own.background
    hidden.forEach((o) => (o.visible = true))
    silhouette.dispose()

    // Prefilter: a 2×2-box pyramid down to the penumbra size, so every blur reads an already-smooth source.
    let src: Texture = targets.silhouette.texture
    const level = (px: number) => (px === BAKE_PX ? targets.silhouette.texture : targets.pyramid.find((t) => t.width === px)!.texture)
    for (const t of targets.pyramid) {
      halve(gl, passes, src, t)
      src = t.texture
    }
    const texels = (sigma: number, px: number) => sigma / (size / px)
    gaussian(gl, passes, level(CONTACT_PX), targets.contactScratch, targets.contact, texels(CONTACT_SIGMA_M, CONTACT_PX))
    // Two rounds widen the penumbra to ~√2 sigma without a wider kernel.
    gaussian(gl, passes, level(PENUMBRA_PX), targets.penumbraScratch, targets.penumbra, texels(PENUMBRA_SIGMA_M, PENUMBRA_PX))
    gaussian(gl, passes, targets.penumbra.texture, targets.penumbraScratch, targets.penumbra, texels(PENUMBRA_SIGMA_M, PENUMBRA_PX))
    gl.setRenderTarget(own.target)
    gl.setClearAlpha(own.clear)
  }

  // Priority 0.5: after the animators (0) mark this frame, before StudioRenderer (1) draws it, so a new bake shows in
  // the same frame as the change that caused it (no flash). Re-bakes only when the casters change: a configuration
  // change, a door swing (Door marks motion.ts), or a caster mesh mounting (texture-tier swap, first load).
  // Never on camera motion: the bake is view-independent, and the look must not change when the camera stops.
  useFrame((state) => {
    let signature = 0
    state.scene.traverse((o) => {
      if (o instanceof Mesh && o.visible && o.castShadow) signature = (signature * 31 + o.id) % 2147483647
    })
    if (signature === baked.current && !dirty.current && !isAnimating()) return
    bake(state.gl, state.scene)
    baked.current = signature
    dirty.current = false
  }, 0.5)

  return (
    <mesh rotation-x={-Math.PI / 2} position={[cx, 0.0005, cz]} material={floor}>
      <planeGeometry args={[size, size]} />
    </mesh>
  )
}
