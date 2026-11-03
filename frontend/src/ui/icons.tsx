// 16 px line icons for the Sterowanie menu: 24-unit viewBox, 1.75 stroke, colour from currentColor.
import type { ReactNode } from 'react'

const Icon = ({ children }: { children: ReactNode }) => (
  <svg className="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
)

/** Front view: a box seen face-on with an arrow into it. */
export const FrontViewIcon = () => (
  <Icon>
    <rect x="5" y="5" width="14" height="14" rx="1" />
    <path d="M12 9v6M9.5 12.5 12 15l2.5-2.5" />
  </Icon>
)

/** 3/4 view: an isometric box. */
export const ThreeQuarterViewIcon = () => (
  <Icon>
    <path d="M12 3 20 7.5v9L12 21l-8-4.5v-9L12 3Z" />
    <path d="M4 7.5 12 12l8-4.5M12 12v9" />
  </Icon>
)

/** Side view: a narrow box with a sideways arrow. */
export const SideViewIcon = () => (
  <Icon>
    <rect x="12" y="5" width="7" height="14" rx="1" />
    <path d="M3 12h6M6.5 9.5 9 12l-2.5 2.5" />
  </Icon>
)

export const DoorOpenIcon = () => (
  <Icon>
    <path d="M4 21h16M6 21V3h10v18" />
    <path d="M6 3l6 2.5V21" />
    <path d="M10 12.5v1" />
  </Icon>
)

export const DoorClosedIcon = () => (
  <Icon>
    <path d="M4 21h16M6 21V3h12v18" />
    <path d="M14.5 12v1.5" />
  </Icon>
)

export const CameraIcon = () => (
  <Icon>
    <path d="M4 8h3l1.5-2h7L17 8h3v11H4V8Z" />
    <circle cx="12" cy="13.5" r="3.25" />
  </Icon>
)

export const FullscreenIcon = () => (
  <Icon>
    <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
  </Icon>
)

export const ExitFullscreenIcon = () => (
  <Icon>
    <path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5" />
  </Icon>
)
