import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 18, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconHome = (p: P) => (
  <Base {...p}>
    <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />
  </Base>
);
export const IconUsers = (p: P) => (
  <Base {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
    <path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.7.8 2.8 2.5 3 5.2" />
  </Base>
);
export const IconCalendar = (p: P) => (
  <Base {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Base>
);
export const IconGem = (p: P) => (
  <Base {...p}>
    <path d="M6 4h12l3.5 5L12 20.5 2.5 9z" />
    <path d="M2.5 9h19M9 4l-1.5 5L12 20.5 16.5 9 15 4" />
  </Base>
);
export const IconSkull = (p: P) => (
  <Base {...p}>
    <path d="M12 3c-4.7 0-8 3.2-8 7.4 0 2.5 1.2 4.3 3 5.4V19a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3.2c1.8-1.1 3-2.9 3-5.4C20 6.2 16.7 3 12 3z" />
    <circle cx="9" cy="11" r="1.6" />
    <circle cx="15" cy="11" r="1.6" />
    <path d="M10.5 20v-2.5M13.5 20v-2.5" />
  </Base>
);
export const IconLock = (p: P) => (
  <Base {...p}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </Base>
);
export const IconUnlock = (p: P) => (
  <Base {...p}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
    <path d="M8 10.5V7.5a4 4 0 0 1 7.6-1.7" />
  </Base>
);
export const IconPlus = (p: P) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);
export const IconSettings = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Base>
);
export const IconShield = (p: P) => (
  <Base {...p}>
    <path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6z" />
  </Base>
);
export const IconCross = (p: P) => (
  <Base {...p}>
    <path d="M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6z" />
  </Base>
);
export const IconSword = (p: P) => (
  <Base {...p}>
    <path d="M14.5 3.5H20.5V9.5L9.5 20.5 3.5 14.5z" />
    <path d="m4 20 3-3M7.5 13.5l3 3" />
  </Base>
);
export const IconArrowRight = (p: P) => (
  <Base {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Base>
);
export const IconCheck = (p: P) => (
  <Base {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Base>
);
export const IconPin = (p: P) => (
  <Base {...p}>
    <path d="M9 3.5h6l-1 5 3.5 3.5v1.5h-11V12L10 8.5z" />
    <path d="M12 13.5V21" />
  </Base>
);

export function Sigil({ size = 32, initials }: { size?: number; initials: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <linearGradient id="sigil-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f0d28a" />
          <stop offset="1" stopColor="#8c7239" />
        </linearGradient>
      </defs>
      <rect x="7" y="7" width="26" height="26" rx="3" transform="rotate(45 20 20)" fill="none" stroke="url(#sigil-g)" strokeWidth="1.5" />
      <rect x="11.5" y="11.5" width="17" height="17" rx="2" transform="rotate(45 20 20)" fill="rgb(214 178 94 / 0.08)" stroke="url(#sigil-g)" strokeWidth="0.75" opacity="0.7" />
      <text x="20" y="25" textAnchor="middle" fontFamily="var(--font-display-serif), Georgia, serif" fontSize="13" fontWeight="700" fill="url(#sigil-g)" letterSpacing="-0.5">
        {initials}
      </text>
    </svg>
  );
}

export const ROLE_ICONS = { tank: IconShield, healer: IconCross, dps: IconSword } as const;

export const IconFeather = (p: P) => (
  <Base {...p}>
    <path d="M20 4c-7 0-13 5-14.5 13L4 20" />
    <path d="M20 4c0 6-3 11-9 13.5H6.5" />
    <path d="M9 13h6.5M12 9h5" />
  </Base>
);
