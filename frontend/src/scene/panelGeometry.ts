import { BoxGeometry, type BufferAttribute } from 'three'
import type { Axis, Vec3 } from './layout'

/** World size one texture tile covers, so grain keeps its physical scale on every panel size. */
export const WOOD_TILE_M = 1.2

const AXES: Axis[] = ['x', 'y', 'z']

/**
 * Box with UVs in real-world units: u runs along the grain axis, v across it.
 * `seed` shifts the UVs so neighbouring panels don't show the same patch of wood.
 */
export function panelGeometry(size: Vec3, grain: Axis, seed: number): BoxGeometry {
  const geo = new BoxGeometry(...size)
  const pos = geo.getAttribute('position') as BufferAttribute
  const nrm = geo.getAttribute('normal') as BufferAttribute
  const uv = geo.getAttribute('uv') as BufferAttribute
  const offU = (seed * 0.618) % 1
  const offV = (seed * 0.371) % 1
  for (let i = 0; i < pos.count; i++) {
    const p = [pos.getX(i), pos.getY(i), pos.getZ(i)]
    const n = [nrm.getX(i), nrm.getY(i), nrm.getZ(i)].map(Math.abs)
    const normalAxis = n.indexOf(Math.max(...n))
    const inPlane = [0, 1, 2].filter((a) => a !== normalAxis)
    const g = AXES.indexOf(grain)
    // On end-grain faces (normal along the grain) keep the longer in-plane axis as u.
    const uAxis = inPlane.includes(g) ? g : inPlane[0]
    const vAxis = inPlane.find((a) => a !== uAxis)!
    uv.setXY(i, p[uAxis] / WOOD_TILE_M + offU, p[vAxis] / WOOD_TILE_M + offV)
  }
  uv.needsUpdate = true
  return geo
}
