import "server-only";
import { query } from "@/lib/db";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  author: string | null;
  createdAt: Date;
};

export async function listAnnouncements(limit = 20): Promise<Announcement[]> {
  return query<Announcement>(
    `select id, title, body, pinned, author, created_at as "createdAt"
     from announcements order by pinned desc, created_at desc limit $1`,
    [limit],
  );
}

export async function createAnnouncement(a: { title: string; body: string; pinned: boolean; author: string | null }) {
  await query(`insert into announcements (title, body, pinned, author) values ($1, $2, $3, $4)`, [
    a.title,
    a.body,
    a.pinned,
    a.author,
  ]);
}

export async function setPinned(id: string, pinned: boolean) {
  await query(`update announcements set pinned = $2 where id = $1`, [id, pinned]);
}

export async function deleteAnnouncement(id: string) {
  await query(`delete from announcements where id = $1`, [id]);
}
