import { notFound, redirect } from "next/navigation";
import { isWriter } from "@/lib/auth";
import { getEvent } from "@/lib/data/events";
import { raidOptions } from "@/lib/data/progression";
import { updateEventAction } from "@/lib/actions/events";
import { toLocalInput, tzName } from "@/lib/time";
import { EventForm } from "@/components/event-form";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Edit event" };

export default async function EditEventPage({ params }: PageProps<"/events/[id]/edit">) {
  const { id } = await params;
  if (!(await isWriter())) redirect(`/login?next=/events/${id}/edit`);
  const [event, raids] = await Promise.all([getEvent(id), raidOptions()]);
  if (!event) notFound();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Calendar" title={`Edit ${event.title}`} />
      <EventForm
        action={updateEventAction}
        raids={raids}
        tzLabel={tzName()}
        submitLabel="Save changes"
        initial={{
          id: event.id,
          title: event.title,
          kind: event.kind,
          raidId: event.raidId ?? "",
          ruleset: event.ruleset ?? "",
          startsAt: toLocalInput(event.startsAt),
          durationMinutes: event.durationMinutes,
          capacity: event.capacity,
          description: event.description ?? "",
          countsForAttendance: event.countsForAttendance,
        }}
      />
    </div>
  );
}
