import "server-only";
import { GUILD_NAME } from "@/config/guild";
import { query } from "@/lib/db";

// Probe notifications: always posted to the site's news feed; also sent to
// PROBE_NOTIFY_WEBHOOK_URL if set (any endpoint accepting {content, text} JSON,
// e.g. a Discord or Slack incoming webhook — no bot integration involved).

export async function notify(title: string, body: string) {
  await query(`insert into announcements (title, body, pinned, author) values ($1, $2, true, 'API probe')`, [
    title,
    body,
  ]);
  const url = process.env.PROBE_NOTIFY_WEBHOOK_URL;
  if (!url) return { webhook: false };
  try {
    const content = `**${GUILD_NAME} — ${title}**\n${body}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, text: content }),
      signal: AbortSignal.timeout(10_000),
    });
    return { webhook: res.ok };
  } catch {
    return { webhook: false };
  }
}
