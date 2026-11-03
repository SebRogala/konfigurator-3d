import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { WOOD_TILE_M } from './panelGeometry'
import { Color, MeshPhysicalMaterial, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, Vector2, type Texture } from 'three'
import { WOOD_KEYS, type FrontFinish, type GlassKey, type HandleKey, type WoodKey } from '../contract/cabinet'

/**
 * 'low' is the 256 px first-frame tier, swapped for 'full' once it loads (CabinetScene). Full colour maps are
 * 1024 px on phone-width screens (the CSS breakpoint in index.css) and source size elsewhere.
 */
export type TextureTier = 'low' | 'full'
export const PHONE = typeof matchMedia === 'function' && matchMedia('(max-width: 820px)').matches
const woodUrls = (key: WoodKey, tier: TextureTier) => {
  const dir = tier === 'low' ? `/textures/${key}/low` : `/textures/${key}`
  return {
    map: `${dir}/${tier === 'full' && PHONE ? 'color-1k' : 'color'}.webp`,
    normalMap: `${dir}/normal.webp`,
    roughnessMap: `${dir}/roughness.webp`,
  }
}
/** Painted fronts borrow this wood's relief as their fine grain. */
const FINE_GRAIN_SOURCE: WoodKey = 'oak-light'
/** Fine grain repeats this many times more often than the wood veneer tile. */
const FINE_GRAIN_DENSITY = 3
/** The grain albedo map averages about half brightness; this gain brings the front back to its chosen colour. */
const GRAIN_ALBEDO_GAIN = 2

/** Starts loading every wood in one tier, so a later option change finds its maps cached. */
export function preloadWoodTextures(tier: TextureTier) {
  for (const key of WOOD_KEYS) useTexture.preload(Object.values(woodUrls(key, tier)))
}

type WoodMaps = Record<'map' | 'normalMap' | 'roughnessMap', Texture>

/** Real-world length one texture repeat covers along the grain, per wood (grade is baked into each colour map). */
const WOOD_REPEAT_M: Record<WoodKey, number> = {
  'oak-rustic': 0.8,
  'oak-light': WOOD_TILE_M,
  walnut: WOOD_TILE_M,
}

function configureWoodMaps(key: WoodKey, maps: WoodMaps, anisotropy: number): WoodMaps {
  // Panel UVs are in WOOD_TILE_M units; repeat rescales them to this wood's repeat length.
  const repeat = WOOD_TILE_M / WOOD_REPEAT_M[key]
  for (const t of Object.values(maps)) {
    t.repeat.set(repeat, repeat)
    t.wrapS = t.wrapT = RepeatWrapping
    t.anisotropy = anisotropy // G10
    t.needsUpdate = true
  }
  maps.map.colorSpace = SRGBColorSpace // G7; normal and roughness stay linear
  return maps
}

// Configured after the hook returns: drei's onLoad callback does not run when the URLs are already cached,
// which left a second caller's textures clamped and smeared outside 0–1.
function useWoodMaps(key: WoodKey, tier: TextureTier): WoodMaps {
  const anisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy())
  const maps = useTexture(woodUrls(key, tier)) as WoodMaps
  return useMemo(() => configureWoodMaps(key, maps, anisotropy), [key, maps, anisotropy])
}

/** Disposes a resource this module created once it is replaced or unmounted (G20). */
function useDisposeOnReplace(resource: { dispose(): void }) {
  useEffect(() => () => resource.dispose(), [resource])
}

export function useWoodMaterial(key: WoodKey, tier: TextureTier): MeshStandardMaterial {
  const maps = useWoodMaps(key, tier)
  const material = useMemo(
    () => new MeshStandardMaterial({ ...maps, roughness: 1, normalScale: new Vector2(0.6, 0.6) }),
    [maps],
  )
  useDisposeOnReplace(material)
  return material
}

export function useFrontMaterial(front: FrontFinish, tier: TextureTier): MeshStandardMaterial {
  const wood = useWoodMaterial(front.kind === 'wood' ? front.wood : FINE_GRAIN_SOURCE, tier)
  const grain = useWoodMaps(FINE_GRAIN_SOURCE, tier)
  // G6: clone before changing repeat, the cached textures are shared with the oak-light body.
  const fine = useMemo(() => {
    const normalMap = grain.normalMap.clone()
    const roughnessMap = grain.roughnessMap.clone()
    // The grain relief doubles as an albedo map, so the grain reads in the colour, not only in reflections.
    const albedoMap = grain.roughnessMap.clone()
    const maps = [normalMap, roughnessMap, albedoMap]
    for (const t of maps) t.repeat.set(FINE_GRAIN_DENSITY, FINE_GRAIN_DENSITY)
    return { normalMap, roughnessMap, albedoMap, dispose: () => maps.forEach((t) => t.dispose()) }
  }, [grain])
  useDisposeOnReplace(fine)
  const hex = front.kind === 'colour' ? front.hex : null
  const painted = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color(hex ?? '#000000').multiplyScalar(GRAIN_ALBEDO_GAIN),
        map: fine.albedoMap,
        normalMap: fine.normalMap,
        roughnessMap: fine.roughnessMap,
        roughness: 0.55,
        normalScale: new Vector2(1, 1),
      }),
    [hex, fine],
  )
  useDisposeOnReplace(painted)
  return front.kind === 'wood' ? wood : painted
}

/**
 * Door glass. Alpha transparency instead of G8's transmission: a transmissive pane hides every transparent
 * object behind it, and the glass shelf behind the door must stay visible.
 */
export function useGlassMaterial(glass: GlassKey): MeshPhysicalMaterial {
  const material = useMemo(
    () =>
      new MeshPhysicalMaterial({
        transparent: true,
        opacity: glass === 'smoked' ? 0.72 : 0.12,
        color: glass === 'smoked' ? new Color('#1e1f20') : new Color('#e6f0eb'),
        roughness: 0.03,
        metalness: 0,
        ior: 1.5,
        specularIntensity: 1,
        depthWrite: false,
      }),
    [glass],
  )
  useDisposeOnReplace(material)
  return material
}

/**
 * Thick glass shelf behind the door, as a per-face material list in BoxGeometry's group order (+x, -x, +y, -y, +z, -z):
 * clear top and bottom faces, green-tinted denser edges like a real float-glass slab. `lit`: the vitrine light
 * catches the front edge with a faint warm glow (interiorOcclusion.ts owns the light itself).
 */
export function useShelfGlassMaterials(lit: boolean): MeshPhysicalMaterial[] {
  const [face, edge] = useMemo(
    () => [
      new MeshPhysicalMaterial({ color: new Color('#cfe6dc'), transparent: true, opacity: 0.3, depthWrite: false, roughness: 0.05, ior: 1.5, specularIntensity: 1 }),
      new MeshPhysicalMaterial({ color: new Color('#5f9e82'), transparent: true, opacity: 0.85, depthWrite: false, roughness: 0.1, ior: 1.5, specularIntensity: 1, emissive: new Color(lit ? '#ffb46b' : '#000000'), emissiveIntensity: 0.25 }),
    ],
    [lit],
  )
  useDisposeOnReplace(face)
  useDisposeOnReplace(edge)
  return useMemo(() => [edge, edge, face, face, edge, edge], [face, edge])
}

/** Brushed aluminium for the strip under the top board. */
export function useMetalMaterial(): MeshStandardMaterial {
  const material = useMemo(() => new MeshStandardMaterial({ color: '#a4a7aa', metalness: 1, roughness: 0.38 }), [])
  useDisposeOnReplace(material)
  return material
}

export function useHandleMaterial(handle: HandleKey): MeshStandardMaterial {
  const material = useMemo(
    () =>
      handle === 'bar-steel'
        ? new MeshStandardMaterial({ color: '#c9cbcd', metalness: 1, roughness: 0.28 })
        : new MeshStandardMaterial({ color: '#262626', metalness: 0.7, roughness: 0.3 }),
    [handle],
  )
  useDisposeOnReplace(material)
  return material
}

const frontEdges = new WeakMap<MeshStandardMaterial, MeshStandardMaterial>()
/**
 * Shadowed edge finish for a front: its edge faces and the cap behind the door joints. Matte, darkened and with little
 * environment reflection, so joints and front edges read dark instead of catching a bright specular line.
 * One per front material, disposed with it.
 */
export function frontEdgeMaterial(face: MeshStandardMaterial): MeshStandardMaterial {
  let edge = frontEdges.get(face)
  if (!edge) {
    edge = new MeshStandardMaterial({ color: face.color.clone().multiplyScalar(0.35), map: face.map, roughness: 1, metalness: 0, envMapIntensity: 0.15 })
    const e = edge
    face.addEventListener('dispose', () => e.dispose())
    frontEdges.set(face, edge)
  }
  return edge
}

const shadowed = new WeakMap<MeshStandardMaterial, MeshStandardMaterial>()
/**
 * Body wood seen in shadow (the top reveal): same maps, darker and a little rougher. Fakes the occlusion a recessed
 * strip gets in the photo, which the scene has no real-time AO for. One per body material, disposed with it.
 */
export function shadowedWoodMaterial(wood: MeshStandardMaterial): MeshStandardMaterial {
  let m = shadowed.get(wood)
  if (!m) {
    m = wood.clone()
    m.color.multiplyScalar(0.42)
    m.roughness = Math.min(1, wood.roughness + 0.15)
    const own = m
    wood.addEventListener('dispose', () => own.dispose())
    shadowed.set(wood, m)
  }
  return m
}
