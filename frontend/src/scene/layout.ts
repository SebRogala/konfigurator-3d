// Pure cabinet layout: turns a ResolvedCabinet into positioned parts in metres.
// Origin: floor level, centred in x and z; the fronts face +z.
import type { ResolvedCabinet } from '../contract/cabinet'

const MM_PER_M = 1000

// Product proportions read off the reference photo; the contract carries only outer dimensions.
const BODY_BOARD = 0.072 // thick oak sides and top
const TOP_OVERHANG = 0.006 // top board projects past the sides and the front
const BOTTOM_BOARD = 0.045
const PLINTH_HEIGHT = 0.08
const PLINTH_SETBACK = 0.03
const INNER_BOARD = 0.018 // divider, vitrine floor
const BACK_BOARD = 0.012
const FRONT_THICKNESS = 0.018
const FRONT_GAP = 0.003 // G4: keeps fronts off the carcass faces
const FRONT_RECESS = 0.002
const FASCIA_RATIO = 0.13 // of the front zone height
const GLAZED_DOOR_RATIO = 0.4
const GLASS_FRAME = 0.016
const GLASS_THICKNESS = 0.004
const HANDLE_FROM_DOOR_TOP = 0.075
const HANDLE_EDGE_INSET = 0.035
const HANDLE_LENGTH = 0.22

export type Axis = 'x' | 'y' | 'z'
export type Vec3 = [number, number, number]

/** A box part. `grain` is the world axis the wood grain runs along. */
export interface BoxPart {
  id: string
  role: 'body' | 'front' | 'glass' | 'shelf-glass'
  size: Vec3
  position: Vec3
  grain: Axis
}

export interface HandlePart {
  id: string
  /** Centre of the bar on the door's front face. */
  position: Vec3
  length: number
}

export interface CabinetLayout {
  boxes: BoxPart[]
  handles: HandlePart[]
  bounds: { size: Vec3; centre: Vec3 }
}

export function layoutCabinet(c: ResolvedCabinet): CabinetLayout {
  const W = c.widthMm / MM_PER_M
  const H = c.heightMm / MM_PER_M
  const D = c.depthMm / MM_PER_M
  const boxes: BoxPart[] = []
  const handles: HandlePart[] = []
  const box = (id: string, role: BoxPart['role'], grain: Axis, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) =>
    boxes.push({ id, role, grain, size: [x1 - x0, y1 - y0, z1 - z0], position: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2] })

  const xL = -W / 2 + BODY_BOARD
  const xR = W / 2 - BODY_BOARD
  const front = D / 2
  const back = -D / 2
  const yTop = H - BODY_BOARD
  const yBottom = PLINTH_HEIGHT + BOTTOM_BOARD

  // Carcass: butt joints, the top covers the sides, sides run to the floor as legs.
  box('side-left', 'body', 'y', -W / 2, xL, 0, yTop, back, front)
  box('side-right', 'body', 'y', xR, W / 2, 0, yTop, back, front)
  box('top', 'body', 'x', -W / 2 - TOP_OVERHANG, W / 2 + TOP_OVERHANG, yTop, H, back, front + TOP_OVERHANG)
  box('bottom', 'body', 'x', xL, xR, PLINTH_HEIGHT, yBottom, back + BACK_BOARD, front)
  box('plinth', 'body', 'x', xL, xR, 0, PLINTH_HEIGHT, front - PLINTH_SETBACK - BOTTOM_BOARD, front - PLINTH_SETBACK)
  box('back', 'body', 'y', xL, xR, yBottom, yTop, back, back + BACK_BOARD)

  const frontBack = front - FRONT_RECESS - FRONT_THICKNESS
  const xMid = (xL + xR) / 2
  box('divider', 'body', 'y', xMid - INNER_BOARD / 2, xMid + INNER_BOARD / 2, yBottom, yTop, back + BACK_BOARD, frontBack - FRONT_GAP)

  const zoneH = yTop - yBottom
  const yFasciaBottom = yTop - zoneH * FASCIA_RATIO
  const yGlazedBottom = yFasciaBottom - zoneH * GLAZED_DOOR_RATIO

  const sections = [
    { side: 'left' as const, x0: xL, x1: xMid },
    { side: 'right' as const, x0: xMid, x1: xR },
  ]
  // The layout with fascia + upper + lower door sits in the glazed section, or on the left when none is glazed.
  const layoutSide = c.glazedSection === 'right' ? 'right' : 'left'
  const frontBox = (id: string, x0: number, x1: number, y0: number, y1: number) =>
    box(id, 'front', 'y', x0 + FRONT_GAP / 2, x1 - FRONT_GAP / 2, y0 + FRONT_GAP / 2, y1 - FRONT_GAP / 2, frontBack, front - FRONT_RECESS)
  const handleZ = front - FRONT_RECESS
  const innerEdgeX = (s: (typeof sections)[number], inset: number) =>
    s.side === 'left' ? s.x1 - inset : s.x0 + inset

  for (const s of sections) {
    const sx0 = s.side === 'left' ? s.x0 : s.x0 + INNER_BOARD / 2
    const sx1 = s.side === 'left' ? s.x1 - INNER_BOARD / 2 : s.x1
    if (s.side !== layoutSide) {
      frontBox(`door-tall-${s.side}`, s.x0, s.x1, yBottom, yTop)
      // Same height as the lower door's handle, as in the reference.
      const yHandle = yGlazedBottom - HANDLE_FROM_DOOR_TOP
      handles.push({ id: `handle-tall-${s.side}`, position: [innerEdgeX(s, HANDLE_EDGE_INSET + HANDLE_LENGTH / 2), yHandle, handleZ], length: HANDLE_LENGTH })
      continue
    }
    boxes.push({ id: 'fascia', role: 'front', grain: 'x', size: [s.x1 - s.x0 - FRONT_GAP, yTop - yFasciaBottom - FRONT_GAP, FRONT_THICKNESS], position: [(s.x0 + s.x1) / 2, (yTop + yFasciaBottom) / 2, frontBack + FRONT_THICKNESS / 2] })
    // Vitrine floor and its glass shelf, visible through the glazed door.
    box(`vitrine-floor-${s.side}`, 'body', 'x', sx0, sx1, yGlazedBottom - INNER_BOARD, yGlazedBottom, back + BACK_BOARD, frontBack - FRONT_GAP)
    const yShelf = (yGlazedBottom + yFasciaBottom) / 2
    box(`glass-shelf-${s.side}`, 'shelf-glass', 'x', sx0 + 0.002, sx1 - 0.002, yShelf - 0.004, yShelf + 0.004, back + BACK_BOARD + 0.01, frontBack - 0.03)

    const gx0 = s.x0 + FRONT_GAP / 2
    const gx1 = s.x1 - FRONT_GAP / 2
    const gy0 = yGlazedBottom + FRONT_GAP / 2
    const gy1 = yFasciaBottom - FRONT_GAP / 2
    const z1 = front - FRONT_RECESS
    if (c.glazedSection === 'none') {
      frontBox('door-upper', s.x0, s.x1, yGlazedBottom, yFasciaBottom)
      handles.push({ id: 'handle-upper', position: [(s.x0 + s.x1) / 2, gy0 + HANDLE_FROM_DOOR_TOP * 0.6, handleZ], length: HANDLE_LENGTH })
    } else {
      // Slim frame in the front finish, glass pane set in its middle.
      box('glazed-frame-left', 'front', 'y', gx0, gx0 + GLASS_FRAME, gy0, gy1, frontBack, z1)
      box('glazed-frame-right', 'front', 'y', gx1 - GLASS_FRAME, gx1, gy0, gy1, frontBack, z1)
      box('glazed-frame-top', 'front', 'x', gx0 + GLASS_FRAME, gx1 - GLASS_FRAME, gy1 - GLASS_FRAME, gy1, frontBack, z1)
      box('glazed-frame-bottom', 'front', 'x', gx0 + GLASS_FRAME, gx1 - GLASS_FRAME, gy0, gy0 + GLASS_FRAME, frontBack, z1)
      const zGlass = frontBack + FRONT_THICKNESS / 2
      box('glazed-pane', 'glass', 'x', gx0 + GLASS_FRAME - 0.001, gx1 - GLASS_FRAME + 0.001, gy0 + GLASS_FRAME - 0.001, gy1 - GLASS_FRAME + 0.001, zGlass - GLASS_THICKNESS / 2, zGlass + GLASS_THICKNESS / 2)
    }
    frontBox('door-lower', s.x0, s.x1, yBottom, yGlazedBottom)
    handles.push({ id: 'handle-lower', position: [(s.x0 + s.x1) / 2, yGlazedBottom - HANDLE_FROM_DOOR_TOP, handleZ], length: HANDLE_LENGTH })
  }

  return { boxes, handles, bounds: { size: [W + 2 * TOP_OVERHANG, H, D + TOP_OVERHANG], centre: [0, H / 2, TOP_OVERHANG / 2] } }
}
