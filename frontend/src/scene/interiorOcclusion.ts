import type { MeshStandardMaterial } from 'three'
import { Vector3 } from 'three'
import type { CabinetLayout } from './layout'

/** Indirect light left at the back wall of the cavity, against 1 at the opening. */
const BACK_LEVEL = 0.45
/** Indirect light left in an inside corner, and the distance (m) over which it recovers. */
const CORNER_LEVEL = 0.55
const CORNER_REACH_M = 0.09
/** Warm vitrine light: ≈3000 K tint (linear RGB) and its strength on the albedo at the brightest point. */
const VITRINE_TINT = [1, 0.5, 0.18] as const
const VITRINE_STRENGTH = 0.55
/** An empty box: no face is inside it, so no glazed section means no vitrine light. */
const NO_BOX: CabinetLayout['interior'] = { min: [1, 1, 1], max: [-1, -1, -1] }

/**
 * Analytic occlusion for the carcass cavity, on every device: environment (indirect) light on inner faces fades with
 * depth behind the opening and toward inside corners, as a real cabinet's interior sees little of the studio.
 * Direct light and its shadows are untouched; desktop GTAO adds the contact detail on top.
 * Faces count as inner when they lie inside the cavity box and do not face out through the back.
 *
 * The same patch adds the always-on warm vitrine light: inner faces of the glazed compartment gain a warm diffuse
 * term, strongest just under the fascia toward the back wall and fading softly down and toward the glass. It is
 * shading, not a scene light, so it costs no shadow map, cannot leak through solid doors, and looks the same on the
 * moving and settled frames and on phones. Independent of any priced LED option.
 * Installs the shader patch once per material; later calls only move the boxes, so a size change needs no recompile.
 */
type Boxes = Record<'cavityMin' | 'cavityMax' | 'vitrineMin' | 'vitrineMax', { value: Vector3 }>
const installedBoxes = new WeakMap<MeshStandardMaterial, Boxes>()
export function applyInteriorShading(material: MeshStandardMaterial, interior: CabinetLayout['interior'], vitrine: CabinetLayout['vitrine']) {
  const v = vitrine ?? NO_BOX
  const installed = installedBoxes.get(material)
  if (installed) {
    installed.cavityMin.value.set(...interior.min)
    installed.cavityMax.value.set(...interior.max)
    installed.vitrineMin.value.set(...v.min)
    installed.vitrineMax.value.set(...v.max)
    return
  }
  const uniforms: Boxes = {
    cavityMin: { value: new Vector3(...interior.min) },
    cavityMax: { value: new Vector3(...interior.max) },
    vitrineMin: { value: new Vector3(...v.min) },
    vitrineMax: { value: new Vector3(...v.max) },
  }
  installedBoxes.set(material, uniforms)
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCavityPos;\nvarying vec3 vCavityNormal;')
      .replace(
        '#include <fog_vertex>',
        '#include <fog_vertex>\nvCavityPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvCavityNormal = normalize(mat3(modelMatrix) * objectNormal);',
      )
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 cavityMin;\nuniform vec3 cavityMax;\nuniform vec3 vitrineMin;\nuniform vec3 vitrineMax;\nvarying vec3 vCavityPos;\nvarying vec3 vCavityNormal;')
      .replace(
        '#include <aomap_fragment>',
        `#include <aomap_fragment>
{
  const float eps = 0.002;
  vec3 p = vCavityPos;
  vec3 n = normalize(vCavityNormal);
  bool inside = all(greaterThan(p, cavityMin - eps)) && all(lessThan(p, cavityMax + eps)) && n.z > -0.5;
  if (inside) {
    float depth = clamp((cavityMax.z - p.z) / max(1e-4, cavityMax.z - cavityMin.z), 0.0, 1.0);
    // Distance to the walls in the face's own plane; the open front is no wall.
    vec3 d = vec3(min(p.x - cavityMin.x, cavityMax.x - p.x), min(p.y - cavityMin.y, cavityMax.y - p.y), p.z - cavityMin.z);
    d = max(d, 0.0) + abs(n) * 10.0;
    float edge = min(d.x, min(d.y, d.z));
    float cavity = mix(1.0, ${BACK_LEVEL.toFixed(3)}, pow(depth, 0.8)) * mix(${CORNER_LEVEL.toFixed(3)}, 1.0, smoothstep(0.0, ${CORNER_REACH_M.toFixed(3)}, edge));
    reflectedLight.indirectDiffuse *= cavity;
    reflectedLight.indirectSpecular *= cavity;
  }
  bool inVitrine = all(greaterThan(p, vitrineMin - eps)) && all(lessThan(p, vitrineMax + eps)) && n.z > -0.5;
  if (inVitrine) {
    vec3 size = max(vitrineMax - vitrineMin, vec3(1e-4));
    // 0 at the floor/glass, 1 under the fascia/at the back wall: a soft source tucked up and back.
    float up = (p.y - vitrineMin.y) / size.y;
    float back = (vitrineMax.z - p.z) / size.z;
    float glow = smoothstep(-0.2, 1.0, up) * mix(0.55, 1.0, back);
    reflectedLight.indirectDiffuse += diffuseColor.rgb * vec3(${VITRINE_TINT.map((c) => c.toFixed(3)).join(', ')}) * (${VITRINE_STRENGTH.toFixed(3)} * glow);
  }
}`,
      )
  }
  material.customProgramCacheKey = () => 'interior-shading'
  material.needsUpdate = true
}
