-- Reference data. Idempotent: safe to re-run.
--
-- Launch raids unlock Dec 9, 2026. Blizzard has not published boss lists for
-- Barrow Deeps or Hyjal Summit (Forever) yet, so they ship empty — add bosses
-- from the Progression page once the encounter journal is public.

insert into raids (id, name, size, unlock_date, description, sort) values
  ('barrow-deeps',  'Barrow Deeps',   10, '2026-12-09', 'Ancient night elf barrow network built to hold dangerous prisoners.', 1),
  ('hyjal-summit',  'Hyjal Summit',   20, '2026-12-09', 'Snowy peaks, elven ruins and the ghosts of the Third War.', 2),
  ('onyxias-lair',  'Onyxia''s Lair', 40, '2026-12-09', 'The original. Deep breaths.', 3)
on conflict (id) do nothing;

insert into bosses (raid_id, name, sort)
select 'onyxias-lair', 'Onyxia', 1
where not exists (select 1 from bosses where raid_id = 'onyxias-lair');

insert into guild_settings (key, value) values
  ('dkp', '{"startingBalance": 50, "attendanceAward": 10, "decayPercent": 10}'::jsonb)
on conflict (key) do nothing;

insert into feature_flags (key, enabled, source, note) values
  ('blizzard_sync', false, 'default', 'Dark until the namespace probe detects a Forever profile namespace.')
on conflict (key) do nothing;

insert into announcements (title, body, pinned, author)
select 'Welcome to the guild site',
       'Add your planned characters on the Roster page before launch (Nov 4). Raids unlock Dec 9 — sign up on the Calendar.',
       true, 'Officers'
where not exists (select 1 from announcements);
