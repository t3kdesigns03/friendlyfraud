import type { SVGProps } from "react";

/**
 * The crest's raven as a silhouette, facing right, with the mismatched eyes:
 * gold on the left, void violet on the right — read as one bright glint.
 */
export function RavenMark({ size = 28, ...rest }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden {...rest}>
      <defs>
        <linearGradient id="raven-sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a2a12" />
          <stop offset="0.5" stopColor="#140f1c" />
          <stop offset="1" stopColor="#2b1652" />
        </linearGradient>
      </defs>
      {/* perched body, folded wing, tail fan */}
      <path
        d="M8 47c6-6 13-10 21-12 3-8 9-14 18-14 4 0 7 2 9 4l7 1.5-6.5 3c0 6-3 12-9 16-4 3-8 4-12 4l-6 8-2-8c-6 2-13 1-19-2.5z"
        fill="url(#raven-sheen)"
        stroke="#c99a3c"
        strokeOpacity="0.55"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      {/* wing line */}
      <path d="M22 41c6-1 12-4 17-9" fill="none" stroke="#8d55ff" strokeOpacity="0.55" strokeWidth="1" strokeLinecap="round" />
      {/* eye */}
      <circle cx="50" cy="25.5" r="1.7" fill="#b98cff" />
      <circle cx="50" cy="25.5" r="3.6" fill="#8d55ff" opacity="0.25" />
    </svg>
  );
}
