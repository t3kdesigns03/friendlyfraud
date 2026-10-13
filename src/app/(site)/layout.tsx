import Image from "next/image";
import Link from "next/link";
import { GUILD_NAME, GUILD_TAGLINE } from "@/config/guild";
import { isWriter } from "@/lib/auth";
import { isSampleData } from "@/lib/data/settings";
import { logoutAction } from "@/lib/actions/misc";
import { DesktopNav, MobileNav } from "@/components/nav";
import { IconLock, IconSettings, IconUnlock } from "@/components/icons";
import { Credit } from "@/components/credit";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const [writer, sample] = await Promise.all([isWriter(), isSampleData()]);
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/75 backdrop-blur-md" data-solid>
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex min-h-11 items-center gap-2.5">
            <Image src="/crest-mark.webp" alt="" width={32} height={32} className="crest-mark rounded-md" priority />
            <span className="display text-xl tracking-wide text-ink">{GUILD_NAME}</span>
          </Link>
          <DesktopNav />
          <div className="flex items-center gap-1">
            {writer ? (
              <>
                <Link href="/settings" className="btn btn-ghost btn-sm min-h-11 min-w-11" aria-label="Settings">
                  <IconSettings size={16} />
                </Link>
                <form action={logoutAction}>
                  <button className="btn btn-ghost btn-sm min-h-11 text-gold" title="Officer mode — click to lock" aria-label="Lock">
                    <IconUnlock size={16} />
                    <span className="hidden sm:inline">Unlocked</span>
                  </button>
                </form>
              </>
            ) : (
              <Link href="/login" className="btn btn-ghost btn-sm min-h-11" title="Enter guild passcode" aria-label="Unlock">
                <IconLock size={16} />
                <span className="hidden sm:inline">Unlock</span>
              </Link>
            )}
          </div>
        </div>
      </header>
      {sample && (
        <div className="relative z-30 border-b border-void/25 bg-void/10 px-4 py-1.5 text-center text-[11px] tracking-wide text-void-bright" data-solid>
          Sample data — the roster, calendar and progression are placeholders until the real database goes in.
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-10 sm:px-6 sm:pt-10">{children}</main>

      <footer className="relative z-10 border-t border-line/70 bg-bg/70 pb-24 backdrop-blur-sm lg:pb-0" data-solid>
        <div className="relative mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>
            {GUILD_NAME} · {GUILD_TAGLINE} · Not affiliated with Blizzard Entertainment.
          </span>
          <Credit />
        </div>
      </footer>
      <MobileNav />
    </>
  );
}
