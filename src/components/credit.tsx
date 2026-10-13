"use client";

import { useEffect, useRef, useState } from "react";

/**
 * "Built by T3KDesigns", with the studio's world beside it (the dark violet
 * hub with its slender lavender ring, as it appears on t3kdesigns.app). The
 * first time the footer scrolls into view, a raven flies a lazy arc in and
 * perches on the planet. Reduced motion: it's simply perched.
 */
export function Credit() {
  const planet = useRef<HTMLSpanElement>(null);
  const lane = useRef<HTMLSpanElement>(null);
  const [path, setPath] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "flying" | "parked">("idle");

  useEffect(() => {
    const box = lane.current;
    const p = planet.current;
    if (!box || !p) return;
    const measure = () => {
      const b = box.getBoundingClientRect();
      const r = p.getBoundingClientRect();
      const tx = r.left - b.left + r.width / 2 - 12;
      const ty = r.top - b.top - 20;
      const sx = -b.left - 60;
      setPath(`path('M ${sx} ${ty - 40} C ${sx * 0.6} ${ty - 90}, ${tx * 0.4} ${ty + 40}, ${tx - 60} ${ty - 30} S ${tx - 10} ${ty - 30}, ${tx} ${ty}')`);
    };
    measure();
    document.fonts?.ready.then(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const box = lane.current;
    if (!box || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setState("flying");
        io.disconnect();
      },
      { threshold: 0.6 },
    );
    io.observe(box);
    return () => io.disconnect();
  }, []);

  return (
    <a
      href="https://t3kdesigns.app"
      target="_blank"
      rel="noopener"
      className="group relative inline-flex min-h-11 items-center gap-2.5 self-start hover:text-ink sm:self-auto"
    >
      <span ref={lane} aria-hidden className="pointer-events-none absolute inset-0 overflow-visible">
        {path && (
          <span
            className={`credit-raven ${state}`}
            style={{ offsetPath: path, offsetRotate: state === "parked" ? "0deg" : "auto" }}
            onAnimationEnd={(e) => {
              if (e.animationName === "raven-fly") setState("parked");
            }}
          >
            <FlyingRaven />
          </span>
        )}
      </span>
      <span ref={planet} className="inline-block h-9 w-12 shrink-0">
        <T3KPlanet />
      </span>
      <span>
        Built by <span className="font-semibold text-ink-dim group-hover:text-ink">T3KDesigns</span>
      </span>
    </a>
  );
}

function FlyingRaven() {
  return (
    <svg viewBox="0 0 48 24" width="40" height="20" className="block overflow-visible">
      <g className="raven-wings">
        <path d="M22 12 C16 2 8 1 1 4 C8 6 13 9 18 13 Z" fill="#17101f" stroke="#c99a3c" strokeOpacity="0.5" strokeWidth="0.6" />
        <path d="M24 12 C28 2 36 0 44 2 C37 5 32 9 28 13 Z" fill="#1c1030" stroke="#8d55ff" strokeOpacity="0.6" strokeWidth="0.6" />
      </g>
      <path d="M14 13 C18 10 26 9 33 11 L40 11.5 L34 13.5 C30 16 22 17 14 13 Z" fill="#120d18" />
      <circle cx="35" cy="11.6" r="0.9" fill="#b98cff" />
    </svg>
  );
}

function T3KPlanet() {
  return (
    <svg viewBox="0 0 48 36" className="h-full w-full overflow-visible" aria-hidden>
      <defs>
        <radialGradient id="t3k-body" cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#3a3156" />
          <stop offset="0.6" stopColor="#15121e" />
          <stop offset="1" stopColor="#08070d" />
        </radialGradient>
        <radialGradient id="t3k-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.6" stopColor="#9d8ad6" stopOpacity="0" />
          <stop offset="0.85" stopColor="#9d8ad6" stopOpacity="0.35" />
          <stop offset="1" stopColor="#9d8ad6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse className="t3k-ring" cx="24" cy="18" rx="22" ry="5.5" transform="rotate(-14 24 18)" fill="none" stroke="#cfc2f2" strokeWidth="1.1" strokeOpacity="0.7" />
      <circle cx="24" cy="18" r="15" fill="url(#t3k-glow)" />
      <circle cx="24" cy="18" r="11" fill="url(#t3k-body)" stroke="#9d8ad6" strokeOpacity="0.55" strokeWidth="0.8" />
      {[[28, 22], [30.5, 19], [26, 25], [31, 23.5], [27.5, 20.5]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="0.6" fill="#d9ccff" />
      ))}
      <path d="M 2.6 23.3 A 22 5.5 -14 0 0 45.4 12.7" className="t3k-ring" fill="none" stroke="#cfc2f2" strokeWidth="1.4" />
    </svg>
  );
}
