# Friendly Fraud

Guild site for **Friendly Fraud**, a *World of Warcraft: Forever* raiding guild. It covers the roster, raid calendar and signups, attendance, loot with DKP-lite, progression, and guild news.

Built with Next.js 16 (App Router, server actions) on Supabase Postgres. It deploys to Netlify.

To rename the guild, change `GUILD_NAME` at the top of [`src/config/guild.ts`](src/config/guild.ts).

---

## Run it locally

```bash
npm install
cp .env.example .env.local   # set GUILD_PASSCODE at minimum
npm run dev
```

If `DATABASE_URL` is not set, the app runs an **embedded Postgres (PGlite)** in `./.data/`. It applies the same migrations automatically, so you don't need Docker or a Supabase project to work on the site. Run `npm run db:reset-local` to wipe it.

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` / `typecheck` | ESLint (includes the `@/api` boundary rule) / `tsc` |
| `npm run db:migrate` | Apply the schema to `DATABASE_URL` by hand (the app also does it on first boot) |
| `npm run db:reset-local` | Delete the embedded dev database |
| `npm run test:probe` | Test the namespace probe end to end against a mock Battle.net |

## Deploy (Netlify)

### Bones (no database yet)

1. In Netlify, choose **Add new site → Import an existing project → GitHub** and pick `t3kdesigns03/friendlyfraud`, branch `main`. Build settings come from `netlify.toml`: `npm run build`, publish `.next`, Node 22.
2. Under **Site configuration → Environment variables**, set:
   - `GUILD_PASSCODE` — the shared passcode that unlocks editing.
   - `SESSION_SECRET` — any long random string, for example `openssl rand -base64 32`.
3. Deploy.

Without `DATABASE_URL` the site runs on a **temporary** embedded database. Everything works and is clickable, but data resets whenever Netlify recycles the function (usually within minutes to hours of inactivity). The server log says so on boot.

### Real data (Supabase)

1. Create a Supabase project. Copy the **transaction pooler** connection string (port 6543) from Project Settings → Database.
2. Add it in Netlify as `DATABASE_URL` and redeploy.

That's it. On first boot the app applies the schema itself, one instance at a time behind a Postgres advisory lock. Prefer doing it by hand? Run `DATABASE_URL=… npm run db:migrate` and set `DB_AUTO_MIGRATE=0`.

### Optional

- `PROBE_SECRET` turns on the hourly Blizzard namespace probe (`netlify/functions/probe-namespace.mts`).
- The `BLIZZARD_*` variables turn on live probing once you have a Battle.net API client.
- See `.env.example` for the full list.

## The sky (3D)

The crest is the identity. It's rendered from the real artwork everywhere. `npm run crest` bakes `public/crest-art.webp` from `assets/crest-source.webp`: the artwork's own pixels plus a traced alpha matte, so it is never redrawn.

- **Homepage.** A cinematic React Three Fiber scene ([`src/components/scene/`](src/components/scene)): the crest, a gold/violet particle vortex, embers, crystal shards, nebulae and the raid worlds. Roster characters appear as class-coloured lights.
  - The camera fits the whole composition into the hero's "stage" box. On phones that box is a band below the copy and buttons, so the scene never rides up under them or clips at the edges.
  - Scrolling rises the camera over the vortex; the mouse adds parallax.
  - Hovering a raid card, an event row or a crew chip lights its match in the sky. Clicking a world opens its slide-over panel.
- **`/explore` (YERRRP).** The guild's galaxy ([`src/components/galaxy/`](src/components/galaxy)). The Crest Star burns at the centre of a gold/violet nebula, and a void-raven flies sweeping Bézier paths to each world.
  - Every world is one entry in [`src/config/worlds.ts`](src/config/worlds.ts). There are three kinds: **guild** (live raid data), **lore** (atmosphere) and **uncharted** (locked anomalies). Promoting an anomaly is a one-line change.
  - Worlds have real HTML tap targets (at least 44px). On touch, the first tap labels a world and the second flies to it; with a mouse, hover labels and click flies.
  - Phones get a compact layout, a 30fps render cap and no bloom.
  - `node scripts/record.mjs <url> <out.webp> <width> <steps>` records scripted flights from headless Chrome.
- **Tool pages.** Roster, calendar, loot, progression and settings load **no** 3D: crest palette and glass only, for speed and readability.
- **Performance.**
  - Particle tiers auto-degrade by screen size and live FPS.
  - No bloom on small screens.
  - The scene loads after first paint, behind a static crest.
  - `prefers-reduced-motion` or no WebGL keeps the static crest.
- **Screenshots.** `node scripts/shoot.mjs <url> <outDir> 375,768,1440` captures headless shots and reports console errors and horizontal overflow.
- **Local data.** `npm run db:seed-dev` fills the embedded dev DB with fictional characters and events so the sky has something to show.

## Access model

- **Reads are public.** Anyone with the link can see the roster, calendar, loot and progression.
- **Writes need the shared guild passcode** (`GUILD_PASSCODE`). Unlocking sets a signed, httpOnly 30-day cookie. Every server action checks it on the server.
- Rotating `GUILD_PASSCODE` or `SESSION_SECRET` logs everyone out.
- Discord OAuth is planned for phase 2.

## Architecture decisions

### 1. Character identity = two-part name + region + ruleset (never a realm)

Forever is realmless, and names are unique per region. Each character stores `first_name`, `second_name`, `region` and `ruleset`. There is no realm column anywhere.

- **Uniqueness:** `unique (region, lower(first_name), lower(second_name))`. This matches Blizzard's rule.
- **URL / lookup key:** `/characters/{region}/{ruleset}/{first}-{second}`, for example `/characters/us/normal/ashvale-brightwhisper`. See [`src/lib/identity.ts`](src/lib/identity.ts).
- The sync module maps Battle.net profiles onto the same shape, so turning sync on needs no migration.

### 2. Manual roster first; Blizzard API behind a dark module

Everything is entered by hand today. All Battle.net code lives in [`src/api/`](src/api):

```
src/api/
  index.ts          ← the ONLY import surface ("@/api"); every sync call checks the flag
  flags.ts          ← runtime feature flags (DB table, flippable without a deploy)
  notify.ts         ← news-feed post + optional webhook
  blizzard/
    config.ts       ← all guesses about Forever's API shape, env-overridable
    client.ts       ← OAuth client-credentials + GET
    probe.ts        ← namespace probe
    sync.ts         ← character profile/media/equipment sync + guild roster import
```

ESLint blocks imports of `@/api/*` from anywhere else in the codebase.

### 3. Namespace probe

`GET /api/probe` is public. It reads the stored status and returns `{"status":"no_namespace_yet", ...}` until a namespace shows up. `POST /api/probe` runs a probe; it needs either a passcode session or `Authorization: Bearer $PROBE_SECRET`. A Netlify scheduled function sends that POST every hour.

Each run does three checks:

1. **Control:** `static-classic1x-{region}` must answer. If it doesn't, the run is recorded as an *error* (bad credentials or API down), never as a false "no namespace yet".
2. **Static:** checks `static-{tag}-{region}` for each candidate tag (`forever`, `classicforever`, `classic-forever`). A hit is recorded as `static_only`. Officers get one notice, and sync stays dark.
3. **Profile:** fetches a real roster character (the first active main) under `profile-{tag}-{region}` using each candidate realmless path template. A hit is recorded as `namespace_detected`. The run then:
   - saves the discovered shape
   - flips the `blizzard_sync` flag
   - posts a pinned notice (and webhook, if configured)
   - kicks off a full sync

Officers can override the flag on the Settings page. `BLIZZARD_SYNC_DISABLED=1` is a hard kill switch.

## Schema

Tables (`supabase/migrations/20261012000000_init.sql`):

| Table | Purpose |
| --- | --- |
| `members` | People (players). Groups mains and alts. |
| `characters` | Identity (`first_name`, `second_name`, `region`, `ruleset`) plus class, race, role, `is_main`, `status` (`planned` / `active` / `inactive`), level, notes. The `api_*` / `portrait_url` / `equipment` columns are filled only by sync. |
| `raids`, `bosses`, `boss_kills` | Progression. Seeded with the three Dec 9 raids. Bosses can be edited in the UI. |
| `events` | Calendar: kind, optional raid, optional ruleset, start time, duration, size, notes, `counts_for_attendance`. |
| `signups` | `(event, character)` → yes / maybe / no + role + note |
| `attendance` | `(event, character)` → present / late / bench / absent |
| `loot` | Item, recipient, optional event/boss, quality, DKP cost, loot council note |
| `dkp_ledger` | Every DKP change (`start`, `attendance`, `loot`, `decay`, `adjust`). Balance = `sum(amount)`. |
| `announcements` | News feed; pinned posts sort first |
| `guild_settings` | DKP config (starting balance, per-raid award, decay %), discovered API shape |
| `feature_flags` | `blizzard_sync` |
| `probe_runs` | Probe history |

RLS is enabled on every table, with no policies. The Supabase anon key / PostgREST can't touch anything. The app connects server-side as the owner role.

**Attendance %** = (present + late + bench) ÷ events where attendance was taken, counting from when the character joined. Events can opt out with `counts_for_attendance`.

**DKP:**
- New characters get the starting balance.
- Saving attendance rewrites that event's awards in one transaction, so re-saving never double-counts.
- Loot deducts its cost; deleting the loot row refunds it.
- Decay is a manual "Apply decay" button that writes one ledger row per positive balance.

## Times

All event times are entered and shown in **guild time** (`GUILD_TIMEZONE`, default `America/New_York`). Server and phone always agree, and DST is handled.
