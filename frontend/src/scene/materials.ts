import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { Color, MeshPhysicalMaterial, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, Vector2, type Texture } from 'three'
import { WOOD_KEYS, type FrontFinish, type GlassKey, type HandleKey, type WoodKey } from '../contract/cabinet'

const woodUrls = (key: WoodKey) => ({
  map: `/textures/${key}/color.jpg`,
  normalMap: `/textures/${key}/normal.jpg`,
  roughnessMap: `/textures/${key}/roughness.jpg`,
})
/** Painted fronts borrow this wood's relief as their fine grain. */
const FINE_GRAIN_SOURCE: WoodKey = 'oak-light'
/** Fine grain repeats this many times more often than the wood veneer tile. */
const FINE_GRAIN_DENSITY = 3
/** The grain albedo map averages about half brightness; this gain brings the front back to its chosen colour. */
const GRAIN_ALBEDO_GAIN = 2

export function preloadSceneTextures() {
  for (const key of WOOD_KEYS) useTexture.preload(Object.values(woodUrls(key)))
}

type WoodMaps = Record<'map' | 'normalMap' | 'roughnessMap', Texture>

function configureWoodMaps(maps: WoodMaps, anisotropy: number): WoodMaps {
  for (const t of Object.values(maps)) {
    t.wrapS = t.wrapT = RepeatWrapping
    t.anisotropy = anisotropy // G10
    t.needsUpdate = true
  }
  maps.map.colorSpace = SRGBColorSpace // G7; normal and roughness stay linear
  return maps
}

// Configured after the hook returns: drei's onLoad callback does not run when the URLs are already cached,
// which left a second caller's textures clamped and smeared outside 0–1.
function useWoodMaps(key: WoodKey): WoodMaps {
  const anisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy())
  const maps = useTexture(woodUrls(key)) as WoodMaps
  return useMemo(() => configureWoodMaps(maps, anisotropy), [maps, anisotropy])
}

/** Disposes a resource this module created once it is replaced or unmounted (G20). */
function useDisposeOnReplace(resource: { dispose(): void }) {
  useEffect(() => () => resource.dispose(), [resource])
}

/** Colour grade per wood, multiplied into the albedo map: shifts the CC0 scan toward the target finish's tone. */
const WOOD_GRADE: Record<WoodKey, [number, number, number]> = {
  'oak-rustic': [1.3, 1.25, 1.08], // Wood066 is reddish-dark; the reference oak is a lighter golden-brown
  'oak-light': [1, 1, 1],
  walnut: [1, 1, 1],
}

export function useWoodMaterial(key: WoodKey): MeshStandardMaterial {
  const maps = useWoodMaps(key)
  const material = useMemo(
    () => new MeshStandardMaterial({ ...maps, color: new Color(...WOOD_GRADE[key]), roughness: 1, normalScale: new Vector2(0.6, 0.6) }),
    [maps, key],
  )
  useDisposeOnReplace(material)
  return material
}

export function useFrontMaterial(front: FrontFinish): MeshStandardMaterial {
  const wood = useWoodMaterial(front.kind === 'wood' ? front.wood : FINE_GRAIN_SOURCE)
  const grain = useWoodMaps(FINE_GRAIN_SOURCE)
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

/** Glass shelf behind the door, always clear. */
export function useShelfGlassMaterial(): MeshPhysicalMaterial {
  const material = useMemo(
    () => new MeshPhysicalMaterial({ color: new Color('#cfe6dc'), transparent: true, opacity: 0.35, depthWrite: false, roughness: 0.05, ior: 1.5, specularIntensity: 1 }),
    [],
  )
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
