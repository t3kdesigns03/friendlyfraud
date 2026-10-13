"use client";

import Image from "next/image";
import Link from "next/link";
import { GUILD_NAME, GUILD_TAGLINE } from "@/config/guild";
import { useScene } from "@/lib/scene/store";
import { stageHost } from "./scene/labelHost";
import { IconFeather } from "./icons";

/**
 * Copy and buttons own the top band; the stage owns the band below (phone)
 * or the right half (desktop). The 3D sky is framed into the stage, so it
 * never rides up under the buttons. Until the sky is ready — or forever,
 * with reduced motion — the stage shows the crest artwork itself.
 */
export function HomeHero({ countdowns }: { countdowns: { label: string; days: number; date: string }[] }) {
  const ready = useScene((s) => s.ready);
  const [first, ...rest] = GUILD_NAME.split(" ");

  return (
    <section className="relative grid items-center gap-2 lg:min-h-[calc(100svh-9rem)] lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-6">
      <div className="relative z-10 pt-0 sm:pt-6">
        <div className="eyebrow mb-3">{GUILD_TAGLINE}</div>
        <h1 className="display text-[2.9rem] leading-[0.92] text-ink sm:text-7xl xl:text-8xl">
          {first} <span className="text-split">{rest.join(" ")}</span>
        </h1>
        <div className="seam mt-4 max-w-sm sm:mt-6" />
        <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-dim sm:mt-5 sm:text-[15px]">
          Barrow Deeps, Hyjal Summit and Onyxia&apos;s Lair open December 9. Sign up, show up, split the loot.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-5 sm:flex sm:flex-wrap sm:gap-2.5">
          {countdowns.map((c) => (
            <div key={c.label} className="glass flex items-baseline gap-2 rounded-xl px-3 py-1.5 sm:px-3.5 sm:py-2.5">
              <span className="num text-xl text-gold-bright">{c.days > 0 ? c.days : "Live"}</span>
              <span className="text-xs leading-tight text-ink-dim">
                {c.days > 0 ? (c.days === 1 ? "day to" : "days to") : ""} <span className="text-ink">{c.label}</span>
                <span className="block text-muted">{c.date}</span>
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-6 sm:flex sm:flex-wrap sm:gap-2.5">
          <Link href="/events" className="btn btn-gold min-h-11 px-2 sm:px-5">
            <span className="sm:hidden">Calendar</span>
            <span className="hidden sm:inline">Raid calendar</span>
          </Link>
          <Link href="/roster" className="btn min-h-11 px-2 sm:px-5">
            <span className="sm:hidden">Roster</span>
            <span className="hidden sm:inline">The roster</span>
          </Link>
          <Link href="/explore" className="btn min-h-11 border-void/45 bg-void/10 px-2 text-void-bright hover:border-void sm:px-5">
            <IconFeather size={16} /> <span className="sm:hidden">Fly</span>
            <span className="hidden sm:inline">Take flight</span>
          </Link>
        </div>
      </div>

      {/* the stage: the sky is framed into this box */}
      <div
        ref={(el) => {
          stageHost.el = el;
        }}
        aria-hidden
        className="relative mt-1 h-[min(94vw,30rem)] w-full sm:h-[30rem] lg:mt-0 lg:h-[min(76svh,46rem)]"
      >
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-[1400ms] ${
            ready ? "opacity-0" : "opacity-100"
          }`}
        >
          <Image
            src="/crest-art.webp"
            alt=""
            width={1024}
            height={1024}
            priority
            sizes="(min-width: 1024px) 40vw, 80vw"
            className="h-[94%] w-auto max-w-full object-contain drop-shadow-[0_0_40px_rgb(140_85_255_/_0.25)]"
          />
        </div>
      </div>
      <p className="col-span-full -mt-2 text-center text-[10px] tracking-[0.3em] text-muted uppercase lg:mt-0">
        Scroll into the sky
      </p>
    </section>
  );
}

