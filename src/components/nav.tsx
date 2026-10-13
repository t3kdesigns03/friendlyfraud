"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FEATURES } from "@/config/guild";
import { IconCalendar, IconFeather, IconGem, IconHome, IconSkull, IconUsers } from "./icons";

const ALL_NAV = [
  { href: "/", label: "Home", icon: IconHome },
  { href: "/roster", label: "Roster", icon: IconUsers },
  { href: "/events", label: "Calendar", icon: IconCalendar },
  { href: "/loot", label: "Loot", icon: IconGem },
  { href: "/progression", label: "Progress", icon: IconSkull },
  { href: "/explore", label: "YERRRP", icon: IconFeather },
] as const;
export const NAV = ALL_NAV.filter((n) => n.href !== "/loot" || FEATURES.loot);

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/roster") return pathname.startsWith("/roster") || pathname.startsWith("/characters");
  return pathname.startsWith(href);
}

export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
      {NAV.map((n) => {
        const active = isActive(pathname, n.href);
        if (n.href === "/explore") {
          return (
            <Link
              key={n.href}
              href={n.href}
              className="ml-2 flex items-center gap-2 rounded-full border border-void/40 bg-void/10 px-3.5 py-1.5 text-xs font-semibold tracking-[0.16em] text-void-bright uppercase transition-colors hover:border-void hover:text-ink"
            >
              <span className="size-1.5 rounded-full bg-void-bright shadow-[0_0_8px_var(--void)]" />
              YERRRP
            </Link>
          );
        }
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={`relative rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active ? "text-gold-bright" : "text-ink-dim hover:text-ink"
            }`}
          >
            {n.label}
            {active && <span className="absolute inset-x-3 -bottom-[13px] h-px bg-gold" />}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${NAV.length}, minmax(0, 1fr))` }}>
        {NAV.map((n) => {
          const active = isActive(pathname, n.href);
          const Icon = n.icon;
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-1 text-[10px] font-semibold tracking-wide ${
                  active ? "text-gold-bright" : "text-muted"
                }`}
              >
                <Icon size={20} />
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
