import Link from "next/link";
import { redirect } from "next/navigation";
import { RAID_UNLOCK_DATE } from "@/config/guild";
import { isWriter } from "@/lib/auth";
import { raidOptions } from "@/lib/data/progression";
import { createEventAction } from "@/lib/actions/events";
import { tzName } from "@/lib/time";
import { EventForm, type EventFormValues } from "@/components/event-form";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "New event" };

const BLANK: EventFormValues = {
  title: "",
  kind: "raid",
  raidId: "",
  ruleset: "",
  startsAt: "",
  durationMinutes: 180,
  capacity: null,
  description: "",
  countsForAttendance: true,
};

export default async function NewEventPage({ searchParams }: PageProps<"/events/new">) {
  if (!(await isWriter())) redirect("/login?next=/events/new");
  const { preset } = await searchParams;
  const raids = await raidOptions();

  let initial = BLANK;
  const raid = raids.find((r) => r.id === preset);
  if (raid) {
    initial = {
      ...BLANK,
      title: raid.name,
      raidId: raid.id,
      capacity: raid.size,
      startsAt: `${RAID_UNLOCK_DATE}T20:00`,
    };
  } else if (preset === "dungeon") {
    initial = { ...BLANK, title: "Dungeon night", kind: "dungeon", capacity: 5, durationMinutes: 150 };
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Calendar" title="New event" />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Quick start:</span>
        {raids.map((r) => (
          <Link key={r.id} href={`/events/new?preset=${r.id}`} className={`chip h-7 ${preset === r.id ? "chip-gold" : "hover:text-ink"}`}>
            {r.name} · Dec 9
          </Link>
        ))}
        <Link href="/events/new?preset=dungeon" className={`chip h-7 ${preset === "dungeon" ? "chip-gold" : "hover:text-ink"}`}>
          Dungeon night
        </Link>
      </div>
      <EventForm
        key={String(preset ?? "blank")}
        action={createEventAction}
        initial={initial}
        raids={raids}
        tzLabel={tzName()}
        submitLabel="Create event"
      />
    </div>
  );
}
