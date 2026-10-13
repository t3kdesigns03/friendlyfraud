import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Cormorant, Geist, Geist_Mono } from "next/font/google";
import { GUILD_NAME, GUILD_TAGLINE } from "@/config/guild";
import { isWriter } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/misc";
import { DesktopNav, MobileNav } from "@/components/nav";
import { IconLock, IconSettings, IconUnlock, Sigil } from "@/components/icons";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Cormorant({ variable: "--font-display-serif", subsets: ["latin"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: GUILD_NAME, template: `%s · ${GUILD_NAME}` },
  description: `${GUILD_NAME} — ${GUILD_TAGLINE}. Roster, raid calendar, loot and progression.`,
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Live guild data on every request.
export const dynamic = "force-dynamic";

const initials = GUILD_NAME.split(/\s+/)
  .map((w) => w[0])
  .join("")
  .slice(0, 2)
  .toUpperCase();

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const writer = await isWriter();
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${display.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <Sigil size={30} initials={initials} />
              <span className="display text-xl tracking-wide text-ink">{GUILD_NAME}</span>
            </Link>
            <DesktopNav />
            <div className="flex items-center gap-1">
              {writer ? (
                <>
                  <Link href="/settings" className="btn btn-ghost btn-sm" aria-label="Settings">
                    <IconSettings size={16} />
                  </Link>
                  <form action={logoutAction}>
                    <button className="btn btn-ghost btn-sm text-gold" title="Officer mode — click to lock">
                      <IconUnlock size={16} />
                      <span className="hidden sm:inline">Unlocked</span>
                    </button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="btn btn-ghost btn-sm" title="Enter guild passcode">
                  <IconLock size={16} />
                  <span className="hidden sm:inline">Unlock</span>
                </Link>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 sm:px-6 sm:pt-10 lg:pb-16">{children}</main>

        <footer className="hidden border-t border-line lg:block">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-muted">
            <span>
              {GUILD_NAME} · {GUILD_TAGLINE}
            </span>
            <span>Not affiliated with Blizzard Entertainment.</span>
          </div>
        </footer>
        <MobileNav />
      </body>
    </html>
  );
}
