"use client";

import Link from "next/link";
import { CREST_STAR, KIND_LABEL, galaxyWorld } from "@/config/worlds";
import { FEATURES, QUALITY_COLORS } from "@/config/guild";
import type { GalaxyData } from "@/lib/galaxy/data";
import { RavenMark } from "../raven";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h4 className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">{title}</h4>
      <div className="mt-2">{children}</div>
    </section>
  );
}

/** What you learn when the gryphon lands. Guild worlds read live data. */
export function WorldPanelBody({ id, data }: { id: string; data: GalaxyData }) {
  if (id === "crest") {
    const c = data.crest;
    return (
      <>
        <div className="eyebrow">{CREST_STAR.subtitle}</div>
        <h3 className="display mt-1 flex items-center gap-2 text-3xl text-ink sm:text-4xl">
          <RavenMark size={30} /> {CREST_STAR.name}
        </h3>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          {[
            [c.characters, "characters"],
            [c.mains, "mains"],
            [c.players, "players"],
          ].map(([n, l]) => (
            <div key={l as string} className="rounded-xl border border-line bg-bg/50 px-2 py-2.5">
              <div className="num text-xl text-gold-bright">{n}</div>
              <div className="text-[10px] tracking-widest text-muted uppercase">{l}</div>
            </div>
          ))}
        </div>
        <Section title="Next on the calendar">
          {c.next ? (
            <Link href={`/events/${c.next.id}`} className="block rounded-xl border border-gold-dim/50 bg-gold/5 p-3.5 hover:border-gold">
              <div className="font-semibold text-ink">{c.next.title}</div>
              <div className="text-xs text-ink-dim">
                {c.next.when} · <span className="text-yes">{c.next.yes}</span> in
              </div>
            </Link>
          ) : (
            <p className="text-sm text-ink-dim">Nothing scheduled yet.</p>
          )}
        </Section>
        <Section title="Guild news">
          {c.news.length ? (
            <ul className="divide-y divide-line">
              {c.news.map((n) => (
                <li key={n.title} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                  <span className="text-ink">{n.title}</span>
                  <span className="shrink-0 text-xs text-muted">{n.when}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-dim">No news yet.</p>
          )}
        </Section>
        <div className="mt-6 flex gap-2">
          <Link href="/roster" className="btn btn-sm min-h-11">
            Roster
          </Link>
          <Link href="/events" className="btn btn-sm min-h-11">
            Calendar
          </Link>
        </div>
      </>
    );
  }

  const w = galaxyWorld(id);
  if (!w) return null;

  if (w.kind === "uncharted") {
    return (
      <div className="relative">
        <div className="eyebrow" style={{ color: w.color }}>
          {KIND_LABEL.uncharted}
        </div>
        <h3 className="display mt-1 text-4xl text-ink">
          <span className="anomaly-text" style={{ ["--a" as string]: w.color, ["--b" as string]: w.glow }}>
            ? ? ?
          </span>
        </h3>
        <p className="mt-4 text-lg leading-snug text-ink italic">{w.tease?.line}</p>
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-line bg-bg/50 p-3.5 text-sm text-ink-dim">
          <span aria-hidden className="text-lg">🔒</span>
          <span>{w.tease?.hint}</span>
        </div>
      </div>
    );
  }

  if (w.kind === "lore") {
    return (
      <>
        <div className="eyebrow" style={{ color: w.color }}>
          {KIND_LABEL.lore} · {w.subtitle}
        </div>
        <h3 className="display mt-1 text-4xl text-ink">{w.name}</h3>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-dim">{w.lore?.atmosphere}</p>
        <Section title="Lore beats">
          <ul className="space-y-1.5 text-sm text-ink">
            {w.lore?.beats.map((b) => (
              <li key={b} className="flex gap-2">
                <span className="mt-2 size-1 shrink-0 rounded-full" style={{ background: w.color }} />
                {b}
              </li>
            ))}
          </ul>
        </Section>
        <Section title="What's coming">
          <p className="text-sm text-ink-dim">{w.lore?.coming}</p>
        </Section>
      </>
    );
  }

  // guild raid world — live data
  const raid = data.scene.raids.find((r) => r.id === w.raidId);
  const loot = (w.raidId && data.loot[w.raidId]) || [];
  return (
    <>
      <div className="eyebrow" style={{ color: w.color }}>
        {KIND_LABEL.guild} · {raid ? `${raid.size}-player raid` : w.subtitle}
      </div>
      <h3 className="display mt-1 text-4xl text-ink">{w.name}</h3>
      {raid ? (
        <>
          <div className="mt-5 flex items-baseline justify-between">
            <span className="text-sm text-ink-dim">Progress</span>
            <span className="num text-2xl">
              <span className={raid.total && raid.killed === raid.total ? "text-gold-bright" : "text-ink"}>{raid.killed}</span>
              <span className="text-muted">/{raid.total || "?"}</span>
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-gradient-to-r from-gold-dim via-gold-bright to-void-bright" style={{ width: raid.total ? `${(raid.killed / raid.total) * 100}%` : "0%" }} />
          </div>
          <Section title="Bosses">
            {raid.bosses.length ? (
              <ul className="divide-y divide-line">
                {raid.bosses.map((b) => (
                  <li key={b.name} className="flex items-center justify-between py-2 text-sm">
                    <span className={b.killed ? "text-ink" : "text-ink-dim"}>{b.name}</span>
                    <span className={`text-xs ${b.killed ? "text-gold-bright" : "text-muted"}`}>{b.killed ? "Defeated" : "Alive"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-dim">Encounters not announced yet.</p>
            )}
          </Section>
          <Section title="Next run">
            {raid.next ? (
              <Link href={`/events/${raid.next.id}`} className="block rounded-xl border border-gold-dim/50 bg-gold/5 p-3.5 hover:border-gold">
                <div className="font-semibold text-ink">{raid.next.title}</div>
                <div className="text-xs text-ink-dim">{raid.next.when}</div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="num">
                    <span className="text-yes">{raid.next.yes}</span>
                    {raid.next.cap ? <span className="text-muted">/{raid.next.cap}</span> : null}
                    {raid.next.maybe ? <span className="ml-2 text-maybe">+{raid.next.maybe}?</span> : null}
                  </span>
                  <span className="text-gold-bright">Sign up →</span>
                </div>
              </Link>
            ) : (
              <p className="text-sm text-ink-dim">Nothing scheduled yet.</p>
            )}
          </Section>
          {FEATURES.loot && (
          <Section title="Recent loot">
            {loot.length ? (
              <ul className="space-y-1.5 text-sm">
                {loot.map((l, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate">
                      <span style={{ color: QUALITY_COLORS[l.quality] }}>[{l.item}]</span>{" "}
                      <Link href={l.path} className="hover:underline" style={{ color: l.color }}>
                        {l.who}
                      </Link>
                    </span>
                    <span className="shrink-0 text-xs text-muted">{l.when}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-dim">No loot recorded yet.</p>
            )}
          </Section>
          )}
          <Link href="/progression" className="btn btn-sm mt-6 min-h-11">
            Full progression
          </Link>
        </>
      ) : (
        <p className="mt-4 text-sm text-ink-dim">No live data for this raid yet.</p>
      )}
    </>
  );
}
