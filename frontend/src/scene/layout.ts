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
/** Depth of the rebate at the carcass back; the thin back panel sits at its front. Interior parts start in front of it. */
const BACK_BOARD = 0.012
const BACK_PANEL_THICKNESS = 0.004 // HDF
/** How far the back panel runs into the sides, top and bottom grooves (hidden inside them). */
const BACK_PANEL_GROOVE = 0.008
const FRONT_THICKNESS = 0.022
const FRONT_GAP = 0.003 // G4: keeps fronts off the carcass faces
/** Fronts sit inset behind the side boards' front faces, so a shadowed reveal frames them. */
const FRONT_RECESS = 0.01
/** The bottom rail steps back behind the side legs' front faces. */
const BOTTOM_SETBACK = 0.006
/** Depth of the separate edge piece on each side board's front, so it reads as its own thick piece. */
const SIDE_FACE_DEPTH = 0.022
/** Dark cap on the divider's front: the joint between the doors shows it instead of oak. */
const DIVIDER_CAP = 0.002
const FASCIA_RATIO = 0.13 // of the front zone height
const GLAZED_DOOR_RATIO = 0.4
/** Frameless glazed door: the pane fills the door opening; only a slim aluminium profile caps its vertical edges. */
const GLASS_PROFILE = 0.004
const GLASS_PROFILE_PROUD = 0.0005 // profile face just ahead of the pane's, so the faces never coincide
/** Hairline joint between the stacked fascia, glazed/upper door and lower door, so they read as one piece. The doors swing about vertical axes, so it needs no swing clearance. */
const STACK_JOINT = 0.0005
const GLASS_THICKNESS = 0.005
const HANDLE_FROM_DOOR_TOP = 0.075
const HANDLE_EDGE_INSET = 0.035
const HANDLE_LENGTH = 0.22
const SHELF_GLASS_THICKNESS = 0.009 // thick slab, as in the reference
/** Short brushed inserts on the side boards' front faces, right under the top, at the opening's two top corners. */
const METAL_INSERT_HEIGHT = 0.008
const METAL_INSERT_DEPTH = 0.01 // let into the side board
/** The oak reveal between the top and the fronts: same height as the inserts, set back behind the fronts' face. */
const TOP_REVEAL_HEIGHT = 0.016
const TOP_REVEAL_SETBACK = 0.011 // behind the fronts' face
/** Dark reveal between each side board and the fronts beside it. */
const SIDE_REVEAL = 0.004
/** Inserts stop short of the side's outer and inner faces, so no exposed face coincides with the side piece's. */
const METAL_INSERT_SIDE_INSET = 0.0005
const METAL_INSERT_PROUD = 0.0005 // front face just ahead of the side's, so the faces never coincide
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
  /** 'edge': every face takes the shadowed front-edge finish (the cap behind a joint). 'shadow': body wood in shadow (the top reveal). */
  finish?: 'edge' | 'shadow'
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
  /** Carcass, metal inserts, fixed fronts (fascia) and interior. */
  boxes: BoxPart[]
  doors: DoorUnit[]
  bounds: { size: Vec3; centre: Vec3 }
  /** The carcass cavity behind the fronts: inner faces of the sides, bottom, top and back. */
  interior: { min: Vec3; max: Vec3 }
  /** The glazed compartment (behind the glass door, between the vitrine floor and the fascia); null when none is glazed. */
  vitrine: { min: Vec3; max: Vec3 } | null
}

export function layoutCabinet(c: ResolvedCabinet): CabinetLayout {
  const W = c.widthMm / MM_PER_M
  const H = c.heightMm / MM_PER_M
  const D = c.depthMm / MM_PER_M
  const boxes: BoxPart[] = []
  let vitrine: CabinetLayout['vitrine'] = null
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
  box('side-left', 'body', 'y', -W / 2, xL, 0, yTop, back, front - SIDE_FACE_DEPTH)
  box('side-right', 'body', 'y', xR, W / 2, 0, yTop, back, front - SIDE_FACE_DEPTH)
  box('side-face-left', 'body', 'y', -W / 2, xL, 0, yTop, front - SIDE_FACE_DEPTH, front)
  box('side-face-right', 'body', 'y', xR, W / 2, 0, yTop, front - SIDE_FACE_DEPTH, front)
  box('top', 'body', 'x', -W / 2 - TOP_OVERHANG, W / 2 + TOP_OVERHANG, yTop, H, back, front + TOP_OVERHANG)
  box('bottom', 'body', 'x', xL, xR, BASE_CLEARANCE, yBottom, back + BACK_BOARD, front - BOTTOM_SETBACK)
  // Thin back panel set into the rebate: its edges run into the carcass grooves, its back face stays inside the
  // carcass's back plane, so a rear view shows the side/top back edges framing a recessed panel.
  box('back', 'body', 'y', xL - BACK_PANEL_GROOVE, xR + BACK_PANEL_GROOVE, yBottom - BACK_PANEL_GROOVE, yTop + BACK_PANEL_GROOVE, back + BACK_BOARD - BACK_PANEL_THICKNESS, back + BACK_BOARD)

  const frontBack = front - FRONT_RECESS - FRONT_THICKNESS
  // A recessed oak strip under the top, across the opening, reads as a shadowed band; the fronts' zone ends under it.
  const yFrontTop = yTop - TOP_REVEAL_HEIGHT
  const zReveal = front - FRONT_RECESS - TOP_REVEAL_SETBACK
  box('top-reveal', 'body', 'x', xL, xR, yFrontTop, yTop, zReveal - INNER_BOARD, zReveal)
  boxes[boxes.length - 1].finish = 'shadow'
  for (const [side, x0, x1] of [['left', -W / 2, xL], ['right', xR, W / 2]] as const)
    box(`metal-insert-${side}`, 'metal', 'x', x0 + METAL_INSERT_SIDE_INSET, x1 - METAL_INSERT_SIDE_INSET, yTop - METAL_INSERT_HEIGHT, yTop, front - METAL_INSERT_DEPTH, front + METAL_INSERT_PROUD)
  // The fascia + upper + lower section sits in the glazed section, or on the left when none is glazed.
  const layoutSide = c.glazedSection === 'right' ? 'right' : 'left'
  const share = c.sectionSplit === 'wide' ? WIDE_SECTION_SHARE : 0.5
  const xMid = layoutSide === 'left' ? xL + (xR - xL) * share : xR - (xR - xL) * share
  const zDividerFront = frontBack - FRONT_GAP - DIVIDER_CAP
  box('divider', 'body', 'y', xMid - INNER_BOARD / 2, xMid + INNER_BOARD / 2, yBottom, yTop, back + BACK_BOARD, zDividerFront)
  box('divider-cap', 'front', 'y', xMid - INNER_BOARD / 2, xMid + INNER_BOARD / 2, yBottom, yFrontTop, zDividerFront, frontBack - FRONT_GAP)
  boxes[boxes.length - 1].finish = 'edge'

  const zoneH = yFrontTop - yBottom
  const yFasciaBottom = yFrontTop - zoneH * FASCIA_RATIO
  const yGlazedBottom = yFasciaBottom - zoneH * GLAZED_DOOR_RATIO

  const sections = [
    { side: 'left' as const, x0: xL + SIDE_REVEAL, x1: xMid },
    { side: 'right' as const, x0: xMid, x1: xR - SIDE_REVEAL },
  ]
  const frontBox = (id: string, x0: number, x1: number, y0: number, y1: number, gapBelow = FRONT_GAP, gapAbove = FRONT_GAP) =>
    box(id, 'front', 'y', x0 + FRONT_GAP / 2, x1 - FRONT_GAP / 2, y0 + gapBelow / 2, y1 - gapAbove / 2, frontBack, front - FRONT_RECESS)
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
    const sx0 = s.side === 'left' ? xL : s.x0 + INNER_BOARD / 2
    const sx1 = s.side === 'left' ? s.x1 - INNER_BOARD / 2 : xR
    if (s.side !== layoutSide) {
      door(`door-tall-${s.side}`, s, () => {
        frontBox(`door-tall-${s.side}`, s.x0, s.x1, yBottom, yFrontTop)
        // Same height as the lower door's handle, as in the reference.
        const yHandle = yGlazedBottom - HANDLE_FROM_DOOR_TOP
        return { id: `handle-tall-${s.side}`, position: [handleX(s), yHandle, handleZ], length: HANDLE_LENGTH }
      })
      continue
    }
    const yF0 = yFasciaBottom + STACK_JOINT / 2
    const yF1 = yFrontTop - FRONT_GAP / 2
    boxes.push({ id: 'fascia', role: 'front', grain: 'x', size: [s.x1 - s.x0 - FRONT_GAP, yF1 - yF0, FRONT_THICKNESS], position: [(s.x0 + s.x1) / 2, (yF0 + yF1) / 2, frontBack + FRONT_THICKNESS / 2] })
    // Vitrine floor and its glass shelf, visible through the glazed door.
    box(`vitrine-floor-${s.side}`, 'body', 'x', sx0, sx1, yGlazedBottom - INNER_BOARD, yGlazedBottom, back + BACK_BOARD, frontBack - FRONT_GAP)
    if (c.glazedSection !== 'none') vitrine = { min: [sx0, yGlazedBottom, back + BACK_BOARD], max: [sx1, yFasciaBottom, frontBack] }
    const yShelf = (yGlazedBottom + yFasciaBottom) / 2
    box(`glass-shelf-${s.side}`, 'shelf-glass', 'x', sx0 + 0.002, sx1 - 0.002, yShelf - SHELF_GLASS_THICKNESS / 2, yShelf + SHELF_GLASS_THICKNESS / 2, back + BACK_BOARD + 0.01, frontBack - 0.03)

    const gx0 = s.x0 + FRONT_GAP / 2
    const gx1 = s.x1 - FRONT_GAP / 2
    const gy0 = yGlazedBottom + STACK_JOINT / 2
    const gy1 = yFasciaBottom - STACK_JOINT / 2
    const z1 = front - FRONT_RECESS
    door('door-upper', s, () => {
      if (c.glazedSection === 'none') {
        frontBox('door-upper', s.x0, s.x1, yGlazedBottom, yFasciaBottom, STACK_JOINT, STACK_JOINT)
        return { id: 'handle-upper', position: [handleX(s), gy0 + HANDLE_FROM_DOOR_TOP * 0.6, handleZ], length: HANDLE_LENGTH }
      }
      // Frameless pane flush with the fronts' face, edge to edge between the fascia and the lower door; its edges run
      // 0.5 mm into the profiles so no glass edge face coincides with a profile face.
      const zp0 = z1 - GLASS_THICKNESS - 0.002
      box('glazed-profile-left', 'metal', 'y', gx0, gx0 + GLASS_PROFILE, gy0, gy1, zp0, z1 + GLASS_PROFILE_PROUD)
      box('glazed-profile-right', 'metal', 'y', gx1 - GLASS_PROFILE, gx1, gy0, gy1, zp0, z1 + GLASS_PROFILE_PROUD)
      box('glazed-pane', 'glass', 'x', gx0 + GLASS_PROFILE - 0.0005, gx1 - GLASS_PROFILE + 0.0005, gy0, gy1, z1 - GLASS_THICKNESS, z1)
      return undefined
    })
    door('door-lower', s, () => {
      frontBox('door-lower', s.x0, s.x1, yBottom, yGlazedBottom, FRONT_GAP, STACK_JOINT)
      return { id: 'handle-lower', position: [handleX(s), yGlazedBottom - HANDLE_FROM_DOOR_TOP, handleZ], length: HANDLE_LENGTH }
    })
  }

  return {
    boxes,
    doors,
    bounds: { size: [W + 2 * TOP_OVERHANG, H, D + TOP_OVERHANG], centre: [0, H / 2, TOP_OVERHANG / 2] },
    interior: { min: [xL, yBottom, back + BACK_BOARD], max: [xR, yTop, frontBack] },
    vitrine,
  }
}
