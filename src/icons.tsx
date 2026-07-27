import type { CSSProperties, ReactNode } from "react";

export type IconProps = { size?: number; style?: CSSProperties };

const svg = (size: number, style: CSSProperties | undefined, children: ReactNode) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
    aria-hidden
  >
    {children}
  </svg>
);

export const Icon = {
  Play: ({ size = 16, style }: IconProps) =>
    svg(size, style, <path d="M6 4l14 8-14 8z" fill="currentColor" stroke="none" />),
  Pause: ({ size = 16, style }: IconProps) =>
    svg(size, style, <><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" /><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" /></>),
  StepBack: ({ size = 16, style }: IconProps) =>
    svg(size, style, <><path d="M18 5v14l-9-7z" fill="currentColor" stroke="none" /><line x1="6" y1="5" x2="6" y2="19" /></>),
  StepForward: ({ size = 16, style }: IconProps) =>
    svg(size, style, <><path d="M6 5v14l9-7z" fill="currentColor" stroke="none" /><line x1="18" y1="5" x2="18" y2="19" /></>),
  Volume: ({ size = 16, style }: IconProps) =>
    svg(size, style, <><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" stroke="none" /><path d="M16 8a5 5 0 010 8" /></>),
  VolumeOff: ({ size = 16, style }: IconProps) =>
    svg(size, style, <><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" stroke="none" /><line x1="16" y1="9" x2="21" y2="15" /><line x1="21" y1="9" x2="16" y2="15" /></>),
  Fullscreen: ({ size = 16, style }: IconProps) =>
    svg(size, style, <path d="M4 9V5a1 1 0 011-1h4M20 9V5a1 1 0 00-1-1h-4M4 15v4a1 1 0 001 1h4M20 15v4a1 1 0 01-1 1h-4" />),
};
