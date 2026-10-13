-- Friendly Fraud — initial schema
--
-- Identity model: a character is identified by TWO-PART NAME + REGION + RULESET.
-- WoW: Forever is realmless, so there is deliberately no realm column anywhere.
-- Names are unique per region (Blizzard's rule), enforced case-insensitively below.
--
-- All tables live in `public` with RLS enabled and NO policies: the Supabase
-- anon/authenticated roles (PostgREST) can read/write nothing. The app talks to
-- Postgres server-side over a direct connection as the owner role, which
-- bypasses RLS. Writes are gated in the app by the shared guild passcode.

-- gen_random_uuid() is core since Postgres 13 (Supabase runs 15+); no extension needed.

-- ---------------------------------------------------------------------------
-- Members (people) and characters
-- ---------------------------------------------------------------------------

create table members (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  note        text,
  created_at  timestamptz not null default now()
);
create unique index members_name_key on members (lower(name));

create table characters (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid references members(id) on delete set null,

  -- identity (never realm)
  first_name    text not null check (first_name ~ '^[^[:space:]/-]+$'),
  second_name   text not null check (second_name ~ '^[^[:space:]/-]+$'),
  region        text not null check (region in ('us', 'eu', 'kr', 'tw')),
  ruleset       text not null check (ruleset in ('normal', 'pvp', 'rp', 'hardcore')),

  class         text not null,
  race          text not null,
  role          text not null check (role in ('tank', 'healer', 'dps')),
  is_main       boolean not null default true,
  status        text not null default 'planned' check (status in ('planned', 'active', 'inactive')),
  level         int check (level between 1 and 60),
  notes         text,
  joined_at     timestamptz not null default now(),

  -- populated only by the Blizzard API sync module (src/api) once it is live
  api_id         bigint,
  api_level      int,
  api_item_level int,
  portrait_url   text,
  equipment      jsonb,
  api_synced_at  timestamptz,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
-- Blizzard: names are unique per region (across rulesets).
create unique index characters_identity_key
  on characters (region, lower(first_name), lower(second_name));
create index characters_member_idx on characters (member_id);

-- ---------------------------------------------------------------------------
-- Raids, bosses, kills (progression)
-- ---------------------------------------------------------------------------

create table raids (
  id           text primary key,              -- slug, e.g. 'onyxias-lair'
  name         text not null,
  size         int not null,
  unlock_date  date,
  description  text,
  sort         int not null default 0
);

create table bosses (
  id       uuid primary key default gen_random_uuid(),
  raid_id  text not null references raids(id) on delete cascade,
  name     text not null,
  sort     int not null default 0
);
create index bosses_raid_idx on bosses (raid_id, sort);

-- ---------------------------------------------------------------------------
-- Events, signups, attendance
-- ---------------------------------------------------------------------------

create table events (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  kind              text not null default 'raid' check (kind in ('raid', 'dungeon', 'pvp', 'social', 'other')),
  raid_id           text references raids(id) on delete set null,
  ruleset           text check (ruleset in ('normal', 'pvp', 'rp', 'hardcore')),
  starts_at         timestamptz not null,
  duration_minutes  int not null default 180 check (duration_minutes > 0),
  capacity          int check (capacity > 0),
  description       text,
  counts_for_attendance boolean not null default true,
  created_at        timestamptz not null default now()
);
create index events_starts_idx on events (starts_at);

create table signups (
  event_id      uuid not null references events(id) on delete cascade,
  character_id  uuid not null references characters(id) on delete cascade,
  status        text not null check (status in ('yes', 'maybe', 'no')),
  role          text not null check (role in ('tank', 'healer', 'dps')),
  note          text,
  updated_at    timestamptz not null default now(),
  primary key (event_id, character_id)
);

create table attendance (
  event_id      uuid not null references events(id) on delete cascade,
  character_id  uuid not null references characters(id) on delete cascade,
  status        text not null check (status in ('present', 'late', 'bench', 'absent')),
  checked_in_at timestamptz not null default now(),
  primary key (event_id, character_id)
);

create table boss_kills (
  id         uuid primary key default gen_random_uuid(),
  boss_id    uuid not null references bosses(id) on delete cascade,
  event_id   uuid references events(id) on delete set null,
  killed_at  timestamptz not null default now(),
  note       text
);
create index boss_kills_boss_idx on boss_kills (boss_id, killed_at);

-- ---------------------------------------------------------------------------
-- Loot + DKP-lite ledger
-- ---------------------------------------------------------------------------

create table loot (
  id            uuid primary key default gen_random_uuid(),
  character_id  uuid not null references characters(id) on delete cascade,
  event_id      uuid references events(id) on delete set null,
  boss_id       uuid references bosses(id) on delete set null,
  item_name     text not null,
  item_id       int,                           -- optional, for tooltips/API later
  quality       text not null default 'epic' check (quality in ('uncommon', 'rare', 'epic', 'legendary')),
  dkp_cost      int not null default 0 check (dkp_cost >= 0),
  council_note  text,                          -- loot council override note
  awarded_at    timestamptz not null default now()
);
create index loot_character_idx on loot (character_id);
create index loot_awarded_idx on loot (awarded_at desc);

-- Every DKP change is a ledger row; a balance is sum(amount).
create table dkp_ledger (
  id            uuid primary key default gen_random_uuid(),
  character_id  uuid not null references characters(id) on delete cascade,
  kind          text not null check (kind in ('start', 'attendance', 'loot', 'decay', 'adjust')),
  amount        int not null,
  reason        text,
  event_id      uuid references events(id) on delete cascade,
  loot_id       uuid references loot(id) on delete cascade,
  created_at    timestamptz not null default now()
);
create index dkp_ledger_character_idx on dkp_ledger (character_id);
create unique index dkp_ledger_attendance_key on dkp_ledger (event_id, character_id) where kind = 'attendance';
create unique index dkp_ledger_loot_key on dkp_ledger (loot_id) where kind = 'loot';

-- ---------------------------------------------------------------------------
-- Announcements
-- ---------------------------------------------------------------------------

create table announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  body        text not null default '',
  pinned      boolean not null default false,
  author      text,
  created_at  timestamptz not null default now()
);
create index announcements_feed_idx on announcements (pinned desc, created_at desc);

-- ---------------------------------------------------------------------------
-- Settings, feature flags, Blizzard namespace probe log
-- ---------------------------------------------------------------------------

create table guild_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

-- Runtime feature flags. `blizzard_sync` is flipped by the namespace probe,
-- so sync lights up without a rebuild/redeploy.
create table feature_flags (
  key         text primary key,
  enabled     boolean not null default false,
  source      text,                            -- 'default' | 'probe' | 'manual'
  note        text,
  updated_at  timestamptz not null default now()
);

create table probe_runs (
  id          uuid primary key default gen_random_uuid(),
  ran_at      timestamptz not null default now(),
  status      text not null check (status in ('no_namespace_yet', 'static_only', 'namespace_detected', 'unconfigured', 'error')),
  detail      jsonb not null default '{}'::jsonb
);
create index probe_runs_ran_idx on probe_runs (ran_at desc);

-- ---------------------------------------------------------------------------
-- Lock down PostgREST access (see header)
-- ---------------------------------------------------------------------------

alter table members         enable row level security;
alter table characters      enable row level security;
alter table raids           enable row level security;
alter table bosses          enable row level security;
alter table events          enable row level security;
alter table signups         enable row level security;
alter table attendance      enable row level security;
alter table boss_kills      enable row level security;
alter table loot            enable row level security;
alter table dkp_ledger      enable row level security;
alter table announcements   enable row level security;
alter table guild_settings  enable row level security;
alter table feature_flags   enable row level security;
alter table probe_runs      enable row level security;
