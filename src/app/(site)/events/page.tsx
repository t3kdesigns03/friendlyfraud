import Link from "next/link";
import { isWriter } from "@/lib/auth";
import { listEvents } from "@/lib/data/events";
import { dayKey, fmtDateLong, tzAbbr } from "@/lib/time";
import { EventRow } from "@/components/event-row";
import { IconPlus } from "@/components/icons";
import { Empty, PageHeader, SectionTitle } from "@/components/ui";

export const metadata = { title: "Calendar" };

export default async function EventsPage() {
  const [writer, upcoming, past] = await Promise.all([isWriter(), listEvents("upcoming", 60), listEvents("past", 20)]);

  const groups = new Map<string, typeof upcoming>();
  for (const e of upcoming) {
    const k = dayKey(e.startsAt);
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }

  return (
    <>
      <PageHeader
        eyebrow="Calendar"
        title="Raids & events"
        sub={`All times ${tzAbbr()} (guild time). Tap an event to sign up.`}
        actions={
          writer && (
            <Link href="/events/new" className="btn btn-gold">
              <IconPlus size={16} /> New event
            </Link>
          )
        }
      />

      {upcoming.length === 0 ? (
        <Empty title="Nothing on the calendar">
          {writer ? (
            <>
              Raids unlock Dec 9.{" "}
              <Link href="/events/new" className="text-gold hover:underline">
                Schedule the first one
              </Link>
              .
            </>
          ) : (
            "Check back once officers post the first raid."
          )}
        </Empty>
      ) : (
        <div className="flex flex-col gap-6">
          {[...groups.entries()].map(([day, events]) => (
            <section key={day}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                {fmtDateLong(events[0].startsAt)}
              </h2>
              <div className="flex flex-col gap-2">
                {events.map((e) => (
                  <EventRow key={e.id} e={e} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <section className="mt-12">
          <SectionTitle>Past events</SectionTitle>
          <div className="flex flex-col gap-2">
            {past.map((e) => (
              <EventRow key={e.id} e={e} past />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
