import type { Announcement } from "@/lib/data/announcements";
import { deleteAnnouncementAction, togglePinAction } from "@/lib/actions/misc";
import { fmtShortDate } from "@/lib/time";
import { ActionForm, Submit } from "./forms";
import { IconPin } from "./icons";

export function AnnouncementCard({ a, writer }: { a: Announcement; writer: boolean }) {
  return (
    <article className={`card relative overflow-hidden p-5 ${a.pinned ? "border-gold-dim/60" : ""}`}>
      {a.pinned && <div className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-gold-bright to-gold-dim" />}
      <div className="mb-1.5 flex items-center gap-2 text-xs text-muted">
        {a.pinned && (
          <span className="flex items-center gap-1 font-semibold text-gold">
            <IconPin size={12} /> Pinned
          </span>
        )}
        <span>{fmtShortDate(a.createdAt)}</span>
        {a.author && <span>· {a.author}</span>}
      </div>
      <h3 className="display text-xl text-ink">{a.title}</h3>
      {a.body && <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-ink-dim">{a.body}</p>}
      {writer && (
        <div className="mt-4 flex gap-2">
          <ActionForm action={togglePinAction}>
            <input type="hidden" name="id" value={a.id} />
            <input type="hidden" name="pinned" value={a.pinned ? "false" : "true"} />
            <Submit className="btn btn-sm" pendingText="…">
              {a.pinned ? "Unpin" : "Pin"}
            </Submit>
          </ActionForm>
          <ActionForm action={deleteAnnouncementAction} confirm="Delete this post?">
            <input type="hidden" name="id" value={a.id} />
            <Submit className="btn btn-sm btn-danger" pendingText="…">
              Delete
            </Submit>
          </ActionForm>
        </div>
      )}
    </article>
  );
}
