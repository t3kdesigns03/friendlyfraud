import "server-only";
import { one, query } from "@/lib/db";

export type DkpSettings = {
  startingBalance: number;
  attendanceAward: number;
  decayPercent: number;
};

const DEFAULT_DKP: DkpSettings = { startingBalance: 50, attendanceAward: 10, decayPercent: 10 };

export async function getDkpSettings(): Promise<DkpSettings> {
  const row = await one<{ value: Partial<DkpSettings> }>(`select value from guild_settings where key = 'dkp'`);
  return { ...DEFAULT_DKP, ...(row?.value ?? {}) };
}

export async function saveDkpSettings(s: DkpSettings) {
  await query(
    `insert into guild_settings (key, value, updated_at) values ('dkp', $1::jsonb, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [JSON.stringify(s)],
  );
}
