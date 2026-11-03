// Pure cabinet layout: turns a ResolvedCabinet into positioned parts in metres.
// Origin: floor level, centred in x and z; the fronts face +z.
import type { ResolvedCabinet } from '../contract/cabinet'

const MM_PER_M = 1000

// Product proportions read off the reference photo; the contract carries only outer dimensions.
const BODY_BOARD = 0.072 // thick oak sides and top
const TOP_OVERHANG = 0.006 // top board projects past the sides and the front
const BOTTOM_BOARD = 0.045
/** Open space under the raised bottom rail, between the side legs. */
const BASE_CLEARANCE = 0.07
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
const SHELF_GLASS_THICKNESS = 0.009 // thick slab, as in the reference
const METAL_STRIP_HEIGHT = 0.008 // brushed strip under the top board across the front opening
/** Share of the inner width taken by the fascia + upper + lower section in the 'wide' split (measured on the reference). */
const WIDE_SECTION_SHARE = 0.58

export type Axis = 'x' | 'y' | 'z'
export type Vec3 = [number, number, number]

/** A box part. `grain` is the world axis the wood grain runs along. */
export interface BoxPart {
  id: string
  role: 'body' | 'front' | 'glass' | 'shelf-glass' | 'metal'
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

/** A door that swings as one unit: its parts and handle rotate about a vertical hinge axis through `pivot`. */
export interface DoorUnit {
  id: string
  hingeSide: 'left' | 'right'
  /** A point on the hinge axis: the door's outer edge on its front face. */
  pivot: Vec3
  parts: BoxPart[]
  handle?: HandlePart
}

export interface CabinetLayout {
  /** Carcass, fixed fronts (fascia, metal strip) and interior. */
  boxes: BoxPart[]
  doors: DoorUnit[]
  bounds: { size: Vec3; centre: Vec3 }
}

export function layoutCabinet(c: ResolvedCabinet): CabinetLayout {
  const W = c.widthMm / MM_PER_M
  const H = c.heightMm / MM_PER_M
  const D = c.depthMm / MM_PER_M
  const boxes: BoxPart[] = []
  const doors: DoorUnit[] = []
  // Parts go to the carcass until a door is open for building, then into that door.
  let into = boxes
  const box = (id: string, role: BoxPart['role'], grain: Axis, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) =>
    into.push({ id, role, grain, size: [x1 - x0, y1 - y0, z1 - z0], position: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2] })

  const xL = -W / 2 + BODY_BOARD
  const xR = W / 2 - BODY_BOARD
  const front = D / 2
  const back = -D / 2
  const yTop = H - BODY_BOARD
  const yBottom = BASE_CLEARANCE + BOTTOM_BOARD

  // Carcass: butt joints, the top covers the sides, sides run to the floor as legs; the base between them is open.
  box('side-left', 'body', 'y', -W / 2, xL, 0, yTop, back, front)
  box('side-right', 'body', 'y', xR, W / 2, 0, yTop, back, front)
  box('top', 'body', 'x', -W / 2 - TOP_OVERHANG, W / 2 + TOP_OVERHANG, yTop, H, back, front + TOP_OVERHANG)
  box('bottom', 'body', 'x', xL, xR, BASE_CLEARANCE, yBottom, back + BACK_BOARD, front)
  box('back', 'body', 'y', xL, xR, yBottom, yTop, back, back + BACK_BOARD)

  const frontBack = front - FRONT_RECESS - FRONT_THICKNESS
  // The fronts' zone ends under the metal strip.
  const yFrontTop = yTop - METAL_STRIP_HEIGHT
  box('metal-strip', 'metal', 'x', xL, xR, yFrontTop, yTop, frontBack, front - FRONT_RECESS)
  // The fascia + upper + lower section sits in the glazed section, or on the left when none is glazed.
  const layoutSide = c.glazedSection === 'right' ? 'right' : 'left'
  const share = c.sectionSplit === 'wide' ? WIDE_SECTION_SHARE : 0.5
  const xMid = layoutSide === 'left' ? xL + (xR - xL) * share : xR - (xR - xL) * share
  box('divider', 'body', 'y', xMid - INNER_BOARD / 2, xMid + INNER_BOARD / 2, yBottom, yTop, back + BACK_BOARD, frontBack - FRONT_GAP)

  const zoneH = yFrontTop - yBottom
  const yFasciaBottom = yFrontTop - zoneH * FASCIA_RATIO
  const yGlazedBottom = yFasciaBottom - zoneH * GLAZED_DOOR_RATIO

  const sections = [
    { side: 'left' as const, x0: xL, x1: xMid },
    { side: 'right' as const, x0: xMid, x1: xR },
  ]
  const frontBox = (id: string, x0: number, x1: number, y0: number, y1: number) =>
    box(id, 'front', 'y', x0 + FRONT_GAP / 2, x1 - FRONT_GAP / 2, y0 + FRONT_GAP / 2, y1 - FRONT_GAP / 2, frontBack, front - FRONT_RECESS)
  const handleZ = front - FRONT_RECESS
  // Handles sit toward each door's free edge (opposite its outer hinge), same inset on every door, so pairs mirror.
  const handleX = (s: (typeof sections)[number]) =>
    s.side === 'left' ? s.x1 - HANDLE_EDGE_INSET - HANDLE_LENGTH / 2 : s.x0 + HANDLE_EDGE_INSET + HANDLE_LENGTH / 2
  // Each section's doors hinge on its outer side.
  const door = (id: string, s: (typeof sections)[number], build: () => HandlePart | undefined) => {
    const unit: DoorUnit = { id, hingeSide: s.side, pivot: [s.side === 'left' ? s.x0 : s.x1, 0, front - FRONT_RECESS], parts: [] }
    into = unit.parts
    unit.handle = build()
    into = boxes
    doors.push(unit)
  }

  for (const s of sections) {
    const sx0 = s.side === 'left' ? s.x0 : s.x0 + INNER_BOARD / 2
    const sx1 = s.side === 'left' ? s.x1 - INNER_BOARD / 2 : s.x1
    if (s.side !== layoutSide) {
      door(`door-tall-${s.side}`, s, () => {
        frontBox(`door-tall-${s.side}`, s.x0, s.x1, yBottom, yFrontTop)
        // Same height as the lower door's handle, as in the reference.
        const yHandle = yGlazedBottom - HANDLE_FROM_DOOR_TOP
        return { id: `handle-tall-${s.side}`, position: [handleX(s), yHandle, handleZ], length: HANDLE_LENGTH }
      })
      continue
    }
    boxes.push({ id: 'fascia', role: 'front', grain: 'x', size: [s.x1 - s.x0 - FRONT_GAP, yFrontTop - yFasciaBottom - FRONT_GAP, FRONT_THICKNESS], position: [(s.x0 + s.x1) / 2, (yFrontTop + yFasciaBottom) / 2, frontBack + FRONT_THICKNESS / 2] })
    // Vitrine floor and its glass shelf, visible through the glazed door.
    box(`vitrine-floor-${s.side}`, 'body', 'x', sx0, sx1, yGlazedBottom - INNER_BOARD, yGlazedBottom, back + BACK_BOARD, frontBack - FRONT_GAP)
    const yShelf = (yGlazedBottom + yFasciaBottom) / 2
    box(`glass-shelf-${s.side}`, 'shelf-glass', 'x', sx0 + 0.002, sx1 - 0.002, yShelf - SHELF_GLASS_THICKNESS / 2, yShelf + SHELF_GLASS_THICKNESS / 2, back + BACK_BOARD + 0.01, frontBack - 0.03)

    const gx0 = s.x0 + FRONT_GAP / 2
    const gx1 = s.x1 - FRONT_GAP / 2
    const gy0 = yGlazedBottom + FRONT_GAP / 2
    const gy1 = yFasciaBottom - FRONT_GAP / 2
    const z1 = front - FRONT_RECESS
    door('door-upper', s, () => {
      if (c.glazedSection === 'none') {
        frontBox('door-upper', s.x0, s.x1, yGlazedBottom, yFasciaBottom)
        return { id: 'handle-upper', position: [handleX(s), gy0 + HANDLE_FROM_DOOR_TOP * 0.6, handleZ], length: HANDLE_LENGTH }
      }
      // Slim frame in the front finish, glass pane set in its middle.
      box('glazed-frame-left', 'front', 'y', gx0, gx0 + GLASS_FRAME, gy0, gy1, frontBack, z1)
      box('glazed-frame-right', 'front', 'y', gx1 - GLASS_FRAME, gx1, gy0, gy1, frontBack, z1)
      box('glazed-frame-top', 'front', 'x', gx0 + GLASS_FRAME, gx1 - GLASS_FRAME, gy1 - GLASS_FRAME, gy1, frontBack, z1)
      box('glazed-frame-bottom', 'front', 'x', gx0 + GLASS_FRAME, gx1 - GLASS_FRAME, gy0, gy0 + GLASS_FRAME, frontBack, z1)
      const zGlass = frontBack + FRONT_THICKNESS / 2
      box('glazed-pane', 'glass', 'x', gx0 + GLASS_FRAME - 0.001, gx1 - GLASS_FRAME + 0.001, gy0 + GLASS_FRAME - 0.001, gy1 - GLASS_FRAME + 0.001, zGlass - GLASS_THICKNESS / 2, zGlass + GLASS_THICKNESS / 2)
      return undefined
    })
    door('door-lower', s, () => {
      frontBox('door-lower', s.x0, s.x1, yBottom, yGlazedBottom)
      return { id: 'handle-lower', position: [handleX(s), yGlazedBottom - HANDLE_FROM_DOOR_TOP, handleZ], length: HANDLE_LENGTH }
    })
  }

  return { boxes, doors, bounds: { size: [W + 2 * TOP_OVERHANG, H, D + TOP_OVERHANG], centre: [0, H / 2, TOP_OVERHANG / 2] } }
}
