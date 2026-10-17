# 🎣 FishPulse — full team & AI manual

> This is the detailed manual (setup, operations, decisions, changelog). The short public page for judges is [`README.md`](README.md).

**Find the fish. Alert your crew. Fish together.**

FishPulse is a real-time, community-powered fishing activity map. An angler taps **Fish Spotted!**, picks the species and how lively they're biting, and every connected phone sees water ripples pop up at that spot plus a *"Your bro Alex found fish!"* card. Reports expire after 30 minutes, because fishing intel goes stale fast.

> FishPulse shows what anglers **report**. It doesn't verify catches and makes no scientific claims.
>
> **Language:** every feature and all user-facing text in the app are displayed in **English**.

---

## 🌐 Live links

| URL | What it is | Data |
| --- | --- | --- |
| **https://fishpulse-v2.vercel.app** | ⭐ Main site: bright "Sunny Lake" UI with Map / Community / Chat tabs | **Live Mode**: Supabase, shared by everyone in real time |
| https://fishpulse-demo.vercel.app | Old dark-theme build, frozen. Use it as an **offline backup** for demos | Demo Mode: sample data, this browser only |

## 中文速览（团队用）

- **代码仓库**：https://github.com/kylezhang007/fishpulse（**私有**）。给 AI 看的交接说明在 `AGENTS.md`，Claude Code 会自动读取 `CLAUDE.md`。真实的邀请码只存在你本机的 `CODES.local.md` 里，不会上传。

- **主站** https://fishpulse-v2.vercel.app：所有人分享的鱼情实时互相可见（Supabase）。
- **界面语言**：所有功能和界面文字都以**英文**展示。
- **本地预览**：双击 `打开FishPulse.command`，会自动构建并在浏览器打开 http://localhost:4173。
- **发布更新**：双击 `更新网上Demo.command`，重新构建并发布到主站（链接不变）。
- **测试**：`npm test`（单元测试）、`npm run test:live`（模拟两台设备测真实的实时同步）。
- **删除不当内容**：见下方「Moderation」。网页上任何人都不能删帖，只能在 Supabase 后台删。
- 每次改功能、配置或部署，都要同步更新本文件（`README_AI.md`）。`README.md` 是给评委看的英文简介，只在主要功能或链接变化时更新。
- **后续规划（已确认）**：见 `docs/ROADMAP.md` 的「Agreed plan」。邀请码 <MEMBER_INVITE_CODE>（上限 25 人），访客只能看；识鱼用 Fishial（每月 200 credits，每个会员每月 5 次）。
- **管理员**：邀请码填 `<ADMIN_CODE>`（不分大小写，不用填名字），就会以 👑 kylezhang 身份登录，最多 5 台设备。识鱼不限次数（阶段 B 生效），「我的」页面有「🧹 Clear all hotspots」按钮，要连按两下确认，所有打开的页面会立刻同步清空。备用方法：在 Supabase 的 SQL Editor 里运行已保存的 `delete from public.fishing_spots;`。
- **社区（海洋）**：底部「Community」页。会员把自己的鱼卡分享到海里，所有人能看、能点赞、能点头像看主页，新动态会实时从海底浮上来。
- **识鱼**：中间的 📷 按钮。Fishial 密钥只存在 Supabase → Edge Functions → Secrets 里（名字必须是 `FISHIAL_CLIENT_ID` / `FISHIAL_CLIENT_SECRET`）。会员每月 5 次，全站每月 180 次，管理员不限次数。额度可以在 `app_settings` 表里修改，详见下方「Fish ID」一节。
- **项目位置**：`~/Documents/FishPulse/fishpulse`（2026-10-17 从临时文件夹完整复制过来，以后都在这里开发）。

---

## Current status (2026-10-16)

| Area | State |
| --- | --- |
| Map, report flow, detail card, notifications, expiry | ✅ Working, browser-tested at 375 px and desktop |
| Live Mode (Supabase realtime, anonymous auth, RLS) | ✅ Working. `npm run test:live` passes 33/33 (realtime delivery ~0.5–0.8 s); the public site receives reports from another device |
| Bright UI, cute animations, bottom tab bar | ✅ Shipped on fishpulse-v2 |
| Accounts (invite code / guest), profiles, avatars | ✅ Phase A live on fishpulse-v2 |
| Fish ID + catch cards | ✅ Live (Fishial.ai via Edge Function `identify-fish`). 5 per member per month, 180 per site per month, admins unlimited |
| Community ("The Ocean") | ✅ Shared catch cards float in an animated ocean, with likes, profiles, and live updates. Members share; guests read |
| Friends + Chat | ✅ Built and Demo-tested: open a profile → Add friend → the other side accepts → 1:1 live chat with quick replies and unread badges. Members only. Live on Supabase; `npm run test:live` covers it |
| Real iPhone / Android test | ⚠️ Not done yet. Only a phone-sized desktop browser so far |
| Moderation UI | ⚠️ None. Admins delete via the Supabase SQL editor (see below) |

---

## Quick start

**Prerequisites:** Node.js 20+ (22 LTS recommended) and npm. On the team lead's Mac, Node lives in `~/.local/node` and is on the PATH via `~/.zprofile`.

```bash
npm install
cp .env.example .env      # Demo Mode by default; see "Live Mode" to connect Supabase
npm run dev               # http://localhost:5173
```

### Double-click launchers (macOS)

| File | What it does |
| --- | --- |
| `打开FishPulse.command` | Builds the app and opens it at http://localhost:4173. It also prints a LAN address for phones on the same Wi-Fi. Close the window to stop it. |
| `更新网上Demo.command` | Builds the app with the current `.env` and publishes it to **https://fishpulse-v2.vercel.app** (same link every time). Needs a one-time `vercel login`. |

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run dev:host` | Dev server on your LAN (for phones; see the HTTPS note below) |
| `npm run build` | Type-check + production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests (Vitest): expiry, dedup, row mapping, validation, privacy snapping, demo adapter |
| `npm run test:live` | Live Mode smoke test: two independent anonymous "devices" against the real Supabase project. Checks realtime delivery, RLS, and validation. Test reports go to 0,0 (open ocean) and expire in 5 min. |

---

## Data modes

### Demo Mode (no backend)

* 8 seeded **sample** reports on Lake Tahoe (mixed species, activity levels, and ages), refilled on page load when fewer than 6 are still active.
* A **✨ Demo · Simulate** button that injects a sample report through the *same* event pipeline real reports use (ripples, notification, View Spot).
* Sync between **tabs of the same browser** only (BroadcastChannel). Two phones in Demo Mode do **not** see each other.
* Everything sample-generated is labelled "sample" / "Sample data" in the UI.

### Live Mode (Supabase, real cross-device realtime)

**Current project:** `unqtvmligccaduzrhixs` (US West, free plan), URL `https://unqtvmligccaduzrhixs.supabase.co`. Already set up:

* ✅ Migration applied ([`supabase/migrations/20261016000000_create_fishing_spots.sql`](supabase/migrations/20261016000000_create_fishing_spots.sql)), also saved as a query in the dashboard's SQL Editor.
* ✅ Auth → Sign In / Providers → **Allow anonymous sign-ins** turned on.
* ✅ Table is in the `supabase_realtime` publication.

The local `.env` holds the project URL and the **publishable** key. Ask the team lead, or copy it from Supabase → Project Settings → API Keys → *Publishable key*.

```bash
# .env
VITE_DATA_MODE=live
VITE_SUPABASE_URL=https://unqtvmligccaduzrhixs.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_…
```

⚠️ Only ever use the **publishable / anon** key. A `sb_secret_…` or `service_role` key must never go in a `VITE_` variable, because those ship to the browser.

If `live` is requested without credentials, the app falls back to Demo Mode and shows a notice.

#### Setting up a new Supabase project from scratch

1. Create a project at [supabase.com](https://supabase.com).
2. **Authentication → Sign In / Providers → Allow anonymous sign-ins → on → Save.** Required for publishing; reads work without it.
3. **SQL Editor** → paste the migration file → **Run**. Supabase warns about "destructive operations"; that's the `drop … if exists` / `revoke` lines, which only touch the new table. Confirm.
4. Put the project URL and publishable key in `.env`, then run `npm run test:live` to confirm 33/33.

The migration creates `public.fishing_spots` with constraints and indexes, plus a trigger that sets `creator_id`, `created_at`, and a clamped `expires_at` (5 min – 6 h) and enforces a rate limit of 5 reports per user per minute. It also adds RLS policies (read active rows; insert as yourself; no update or delete) and adds the table to realtime.

#### Testing across two phones

1. Open https://fishpulse-v2.vercel.app on **Phone A** and **Phone B**. The top bar should show a green dot and **Live**.
2. Phone A: **Fish Spotted!** → drag the map → Bass → 🤩 On fire → name "Alex" → **Share this spot 🎣**.
3. Phone B: ripples appear at the spot and "Your bro Alex found fish!" slides in → **View Spot** → the camera flies there and the details open.

#### Moderation (delete a bad post)

Nobody can edit or delete reports from the website, by design. To remove one, go to Supabase → **SQL Editor** and run:

```sql
-- see the newest reports
select id, username, fish_type, note, created_at from public.fishing_spots order by created_at desc limit 20;
-- delete one
delete from public.fishing_spots where id = '<id>';
```

Open browsers keep showing a deleted spot until they reload or it expires. A live "delete" event isn't wired up yet.

#### Troubleshooting

* **"Anonymous sign-ins are disabled"**: turn the provider on (step 2 above).
* **Phone B never receives**: check that B's top bar says *Live*. While realtime is down, the app polls every 20 s, so reports still arrive, just slower. Run `npm run test:live` to check the backend.
* **"Easy, captain — too many reports"**: rate limit, more than 5 reports per minute from one guest.
* **The free project was paused**: free Supabase projects pause after ~7 days without traffic. Restore it from the dashboard.

#### Capacity (free tier, approximate; check Supabase's pricing page)

* ~200 **simultaneous realtime connections**, where each open tab is one connection. A 170-person audience fits. Anyone over the limit falls back to 20-second polling instead of failing.
* Storage is a non-issue: one report is ~0.3 KB.
* Animations run on each phone and use no database or network quota.

---

## Accounts (invite code / guest)

* **First open on a device:** enter the shared invite code **`<MEMBER_INVITE_CODE>`** plus a unique name to become a **member**, or tap "Continue as a guest" (auto name `Guest-1234`).
* **Guests** can browse the map, hotspots, community, and profiles only. Posting hotspots, Fish ID, catch cards, and community posts are member-only. This is enforced by RLS and the `register_*` RPCs, not just the UI. A guest can upgrade from the "Me" tab, keeping the same account.
* The code lives only in `public.invite_codes` (clients can't read it). **Cap: 25 members.** Demo Mode accepts any non-empty code, so nothing secret ships in the bundle.
* **Admin (Supabase → SQL Editor):**

```sql
select code, used_count, max_uses, active from public.invite_codes;          -- usage
update public.invite_codes set active = false where code = '<MEMBER_INVITE_CODE>';    -- disable
insert into public.invite_codes (code, max_uses) values ('NEWCODE', 25);     -- new code
select display_name, role, created_at from public.profiles order by created_at;
```

* **Admin:** code **`<ADMIN_CODE>`** (case-insensitive, stored only in the DB with `grants_role = 'admin'`, up to 5 devices) signs you in as **👑 kylezhang** with no name needed. The name "kylezhang" is reserved. Admins can post, will have **unlimited Fish ID** (no per-month cap) in Phase B, and see **Admin tools → 🧹 Clear all hotspots** on the Me page. That button needs two taps, calls the `admin_clear_spots()` RPC (admin-checked in the DB), and broadcasts "refresh" on the `fishpulse-control` Realtime channel so every open page reloads its spots. One device (the Claude app's built-in browser) used 1 of the 5 admin seats during testing.
* **One-click clear, without the website:** Supabase → SQL Editor → *PRIVATE* → the saved query (currently titled "Untitled query"; rename it "Clear all hotspots") contains `delete from public.fishing_spots;`. Click **Run**, then confirm. Open pages drop the spots on their next refresh or reconnect.
* **Test-only code:** `npm run test:live` registers members with a separate code from `SMOKE_INVITE_CODE` in the local `.env` (max 1000 uses, never shipped), so tests don't use up the 25 seats. Test members are named `zz-smoke-…` / `zz-ui-check`. Disable the code with the `update … active = false` line above, using that code.
* Migrations to run, in order: `20261016000000_create_fishing_spots.sql`, `20261017000000_profiles_and_invites.sql`, then `20261017010000_admin.sql` (all three have already been run on the current project).

## Community — "The Ocean"

* **Community tab** = an animated sea. Each shared catch card floats up from the depths and drifts on the water, carried by its species' fish.
* **Share:** members tap **＋ Share** (or **🌊 Share to Community** on a catch card), pick one of their own cards, add a caption (quick captions available), and release it. Each card can be shared once. Guests see 🔒.
* **Interact:** tap an avatar to open that angler's profile (stats, badges, card wall); tap the photo to open the full card; 👍 → 💖 to like (members).
* **Live:** new posts appear for everyone instantly, with a bubble trail and a "🐟 New catch from …" toast.
* **Data:** `posts` (one per catch, `user_id` → profiles, `catch_id` → catches) and `post_likes`. RLS: anyone reads; members insert their own; authors delete their own. The feed query embeds `catches`, `profiles!posts_user_id_fkey`, and `post_likes(count)`.
* **Admin:** clear the ocean with `delete from public.posts;` in the SQL Editor.

## Fish ID (Fishial.ai)

* **Flow:** 📷 centre button (members and admins) → photo (camera or library) → compressed to ≤1280 px JPEG → optional one-shot location turned into a **place name only** (OpenStreetMap Nominatim) → Supabase **Edge Function `identify-fish`** → Fishial → collectible **catch card**, saved automatically to the Me page.
* **The key never reaches the browser.** It lives in Supabase → Edge Functions → **Secrets** as **`FISHIAL_CLIENT_ID`** (the API Key ID) and **`FISHIAL_CLIENT_SECRET`** (the Secret Key, which Fishial shows only once when you create the key). The names must match exactly. The unused secrets `fishpulse` and `fishluse` can be deleted.
* **Quotas** (table `app_settings`, editable in the SQL Editor): `fishid_member_monthly` = 5 and `fishid_global_monthly` = 180 (the Fishial plan is 200 credits per month). Admins are exempt. Failed calls (`outcome = 'error'`) don't count; "no fish found" does, because Fishial still charged a credit.

```sql
update public.app_settings set value = 10 where key = 'fishid_member_monthly';                  -- change a limit
select outcome, count(*) from public.fish_id_requests where created_at >= date_trunc('month', now()) group by 1;  -- usage this month
delete from public.catches;                                                                       -- wipe all cards
```

* **Species mapping:** Fishial returns a scientific name. The genus or species picks our icon (*Micropterus*, *Morone*… → Bass; *O. mykiss*, *Salmo trutta*, *Salvelinus* → Trout; other *Oncorhynchus* and *Salmo salar* → Salmon; *Ictalurus*, *Ameiurus*, *Silurus*… → Catfish). Anything else gets the generic mascot. The card links to `en.wikipedia.org/wiki/<scientific name>`.
* **Updating the function:** edit `supabase/functions/identify-fish/index.ts`, then paste it into Dashboard → Edge Functions → identify-fish → Code → Deploy (or use `supabase functions deploy identify-fish` if you have the CLI logged in). Leave "Verify JWT" on; a probe confirmed user tokens pass it.
* **Demo Mode** simulates recognition (random of the 4 species, no credits). The sheet says so.
* Migrations: also run `20261017020000_fish_id.sql` (already run on the current project).

## Deploying

**Current method (used for fishpulse-v2):** `更新网上Demo.command` runs `npm run build` locally, copies `dist/` into **`../deploy-v2/`, which is outside the git repo**, and uploads it with `vercel deploy --prod --project fishpulse-v2`. The staging folder must stay outside the repo: deploying from inside it makes Vercel attach the git commit author, and the Hobby plan **blocks** the deployment ("commit author doesn't have permission"). Vite bakes the `VITE_*` values from **your local `.env`** into the bundle at build time.

**Later, with GitHub:** connect the repo in Vercel (Add New Project → import). `vercel.json` already sets the Vite framework, `npm run build`, and `dist/`. You **must** then add `VITE_DATA_MODE`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY` under Vercel → Settings → Environment Variables, because `.env` is git-ignored.

### Phones on your LAN (dev)

`npm run dev:host` (or the `打开FishPulse.command` launcher) prints a `http://192.168.x.x` URL. Over plain HTTP, phones **block geolocation**; the app says so, and map navigation still works. Use the Vercel URL for the full experience.

---

## Configuration

| Variable | Default | Notes |
| --- | --- | --- |
| `VITE_DATA_MODE` | auto | `demo` \| `live`. Auto picks live when the Supabase vars exist. |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | — | Live Mode only. Publishable key only. |
| `VITE_MAP_STYLE_URL` | OpenFreeMap `positron` | Any MapLibre style. Re-tinted at runtime into the bright "Sunny Lake" palette (`src/components/map/mapStyle.ts`). |
| `VITE_DEFAULT_CENTER` | `39.09,-120.04` | Lake Tahoe. Demo seeds are offsets from here, tuned for open water. |
| `VITE_DEFAULT_ZOOM` | `10` | |
| `VITE_REPORT_TTL_MINUTES` | `30` | Server clamps to 5 min – 6 h |
| `VITE_SUBMIT_COOLDOWN_SECONDS` | `20` | Client-side UX cooldown |
| `VITE_ENABLE_SIMULATOR` | `true` | Simulate button (Demo Mode only, never shown in Live Mode) |
| `SMOKE_INVITE_CODE` | — | **Not a VITE_ var, so it never ships.** Test-only invite code used by `npm run test:live` |

**Map tiles:** [OpenFreeMap](https://openfreemap.org) is free and keyless, but it runs on donations under fair use. A cold load can take ~10 s. Before real traffic, switch to a paid or quota-backed provider (MapTiler, Stadia, or self-hosted PMTiles).

---

## UI at a glance

* **Theme:** cream background, white rounded cards, Nunito + Baloo 2 fonts. Activity colours are 🙂 Chill (sky blue), 😄 Good (warm orange), and 🤩 On fire (coral).
* **Map tab:** hotspot bubbles showing the reported species' cartoon fish. Lively spots bob, and "On fire" spots release bubbles. New reports make water ripples.
* **Picking a location:** the pin marks the spot. In 🫧 Rough area mode, a dashed circle shows the ~300 m privacy cell the report will actually be published in. It hops between cells as you drag, and the marker lands in its centre. 📍 Exact pin publishes the pin point itself.
* **Species:** the MVP offers exactly 4: Bass, Trout, Salmon, and Catfish. The report form shows a "🐠 More species coming soon!" hint, which is the talking point for the roadmap. The list lives in `FISH_SPECIES` in `src/types/fishing.ts`, and the database accepts any name, so adding species needs no migration. Each species has its own cartoon icon (approved 2026-10-16) in `src/components/animations/SpeciesIcon.tsx`: green bass with a jagged stripe and big mouth, olive trout with a pink rainbow stripe, blue-backed coral salmon with a forked tail, and grey catfish with whiskers. The icons appear on map markers, the form chips, the detail card, notifications, and the "Nice catch!" hop. Unknown species fall back to the generic mascot.
* **Your own report:** the fish hops out with squash-and-stretch, hearts, stars, and droplets burst, and a "Nice catch! ✨" bubble appears.
* **Friends + Chat:** tap anyone's avatar → profile → **➕ Add friend**. The other member sees the request in the Chat tab (red badge) and taps **Accept**; then both get **💬 Message**. Chats are 1:1, live, with quick replies (🎣 Heading over! · 🐟 Nice one! · Where exactly? · 👍). Only friends can message each other (enforced by RLS via `are_friends()`); guests see a members-only gate. Either side can cancel, decline or unfriend. Admin wipe: `delete from public.messages; delete from public.friendships;`.
* **Navigate:** a hotspot's detail card has **🗺️ View on map** and **🧭 Navigate**. Navigate opens Google Maps directions to the spot (the app on phones, the website elsewhere) via `googleMapsDirectionsUrl()` in `src/domain/location.ts`. For 🫧 Rough-area reports it goes to the centre of the ~300 m cell, and the card says so; the exact spot is never revealed.
* Notifications still pop up on every tab, and **View Spot** jumps back to the map.
* `prefers-reduced-motion` is respected throughout.

## Project structure

```
src/
  app/App.tsx                 application layer: UI state, tabs, wiring
  components/
    map/                      MapLibre map, markers, picker, theme (no backend imports)
    animations/               FishIcon, ripples/bubbles, celebration, notification cards
    fishing/                  ReportForm, SpotDetailCard, TopBar, BottomBar, ActivityIndicator
    ui/                       BottomSheet, TabBar, ComingSoon, Toast
  hooks/                      useFishingSpots (data ↔ UI), geolocation, cooldown, …
  services/                   FishingSpotService + mock (demo) and Supabase (live) adapters
  domain/                     pure, unit-tested logic (expiry, dedup, validation, privacy)
supabase/migrations/          database schema, RLS, trigger
scripts/live-smoke-test.mjs   two-device Live Mode test
docs/                         ARCHITECTURE.md, ROADMAP.md
```

## Docs

* [AGENTS.md](AGENTS.md): rules, setup, and known traps for AI assistants (read this before editing).
* [Architecture](docs/ARCHITECTURE.md): layers, data flow, realtime handling, and the animation trigger system.
* [Known limitations & roadmap](docs/ROADMAP.md)

## Demo script (≈90 s)

1. **Map:** open https://fishpulse-v2.vercel.app on the projector and on Phone A and Phone B.
2. **Report (Phone A):** Fish Spotted! → Bass → 🤩 On fire → "Alex" → Share. The fish hops, hearts and stars burst, and a toast confirms the save.
3. **Receive (Phone B + projector):** ripples appear and "Your bro Alex found fish!" slides in → View Spot → the camera flies there → details.
4. **Pitch:** "No stale forum posts: live intel from the anglers around you, gone in 30 minutes."

**Pre-warm:** open the site on every device a minute early, because cold map tiles take ~10 s.
**Backup:** if the venue network fails, use https://fishpulse-demo.vercel.app with **Simulate sighting**, and say clearly that it's simulated.

---

## Changelog

* **2026-10-17 (docs):** Renamed the full manual to `README_AI.md`. Added a new concise English `README.md` for hackathon judges. AGENTS.md / CLAUDE.md now point to `README_AI.md` for the update-every-time rule.
* **2026-10-17 (navigate):** Added a **🧭 Navigate** button on the hotspot detail card that opens Google Maps directions to the spot (rough-area reports go to the cell centre, with a note). Demo-tested at 375 px; 34 unit tests pass. Published to fishpulse-v2.
* **2026-10-17 (friends + chat):** Added migration `20261017040000_friends_chat.sql` (`friendships` with one per pair, request → accept, either side can remove; `messages` that only friends can send, via `are_friends()`; realtime on both) and the `SocialService` interface. Both adapters are implemented (Demo: anglers auto-accept requests and reply). UI: an Add friend → Request sent → Accept → 💬 Message button on profiles, a Chat tab with requests and conversations plus unread dots, a red badge count on the tab, a live conversation view with quick replies, and a members-only gate for guests. Demo-mode browser test passed (request → accept → message → live reply). Migration run on the live project; `npm run test:live` now passes 33/33, including guest/stranger blocks, accept rules, realtime delivery and conversation privacy. Published to fishpulse-v2.
* **2026-10-17:** Fixed Vercel deployments being **Blocked** after the repo was created: the deploy staging folder moved from `deploy-v2/` to `../deploy-v2/` (outside git). Two blocked deployments remain in the Vercel list and can be ignored.
* **2026-10-17 (Phase C, Community, "The Ocean"):** Added an ocean page (sky, animated waves, rising bubbles, swimming fish). Shared catch cards float up from the depths and drift, each carried by its species' cartoon fish. A post shows the author's avatar (opens the profile), the photo (opens the full card), the caption, species, place, and a like button (👍 or 💖 with count, optimistic). Members share their own cards (one share per card) from the ocean's "＋ Share" button or from a card's "🌊 Share to Community" button, with quick captions. New posts arrive live for everyone, with a bubble trail and a toast. Guests can only read. Migration `20261017030000_community.sql` (`posts`, `post_likes`, RLS, realtime) has been **run**. Fixed an ambiguous author embed with `profiles!posts_user_id_fkey`. `npm run test:live` now runs **24/24** (feed readable, can't share another member's card, guests can't like). The first live post is kylezhang's bass card. **Published to fishpulse-v2 and pushed to GitHub.**
* **2026-10-17:** Pushed to the private GitHub repo **kylezhang007/fishpulse** (82 files; secrets scan clean). Added `AGENTS.md` (handoff notes for AI assistants) and `CLAUDE.md`. Access codes in docs and migrations are now placeholders (`<MEMBER_INVITE_CODE>`, `<ADMIN_CODE>`); the real values are in the git-ignored `CODES.local.md`. Also created a source zip (`git archive`) next to the project folder. **Before making the repo public, change the admin code:** it equals the admin's public display name.
* **2026-10-17 (Phase B, Fish ID):** **Live.** The 📷 centre button takes a photo, compresses it, looks up a one-shot place name (OpenStreetMap), and sends it to the Edge Function `identify-fish`. The function checks member or admin, applies the monthly quota (admins exempt), calls Fishial v2 (`/auth` then `/recognize`), stores the photo in the public `catch-photos` bucket, and inserts a `catches` row. The result is a flip-in collectible card (No., AI %, species and icon, scientific name, date, 📍 place, Wikipedia link, owner) that also appears on the Me page wall. Verified on the real backend: a bass photo returned *Largemouth black bass* (*Micropterus nigricans*) at 79% and 75%, mapped to the Bass icon. The photo URL is public, the quota went from 5 to 4 for a test member, and the admin sees "Unlimited". Testing used **2 Fishial credits**. Published to fishpulse-v2.
* **2026-10-17:** Moved the project to `~/Documents/FishPulse/fishpulse` (full copy, verified identical; typecheck, tests, and build pass there). The old temporary session folder is no longer used.
* **2026-10-17 (admin):** Added the admin account: enter code `<ADMIN_CODE>` (any case, no name needed) to become **👑 Admin "kylezhang"**, on up to 5 devices. Admins get unlimited Fish ID once Phase B lands and an Admin tools card on the Me page with **🧹 Clear all hotspots**, which needs two taps (the second within 4 s) and then broadcasts a "refresh" so every open page drops the cleared spots instantly. Backup: a saved SQL Editor query. Migration `20261017010000_admin.sql` has been **run**. `npm run test:live` now covers 21 checks (non-admins can't clear, "kylezhang" is reserved, the refresh broadcast arrives), and all pass. The admin clear itself wasn't run on live data. Published to fishpulse-v2 (Live Mode); the bundle contains no codes.
* **2026-10-17 (Phase A, accounts):** Shared invite code `<MEMBER_INVITE_CODE>` (25 members, stored only in the DB) or guest mode (`Guest-1234`, browse-only, enforced by RLS and RPCs). Names are unique, with a live availability check. Added the "Me" profile page (fishing career fixed at 2 days, days in community, spots shared, badges, catch-card placeholder), guest-to-member upgrade, reporter avatars on markers and the detail card that link to their profile, quick messages "🔥 They're biting!" and "🎣 Come fish with me!", and a 5-tab nav with a raised Fish ID button (placeholder until Phase B). Migration `20261017000000_profiles_and_invites.sql` has been **run** in Supabase. `npm run test:live` passes **18/18**, and 33 unit tests pass. Published to fishpulse-v2 (Live Mode); the production bundle contains no invite codes.
* **2026-10-16:** Fixed the "Share this spot" button being squashed (it could shrink in the sheet's flex layout). Fixed published spots landing about 40 px above the pin: the location now comes from the pin's own screen point (`getPinLocation`) instead of the map centre, which lagged whenever the camera padding was still animating. In "Rough area" mode the dashed circle previews the exact privacy cell, at true size, that will be published. The map no longer jumps after publishing. Dev builds expose the map as `window.__fpMap` for console debugging. Published to fishpulse-v2 (Live Mode).
* **2026-10-16:** Added 4 approved cartoon species icons (Bass, Trout, Salmon, Catfish) across markers, form chips, detail card, notifications, and celebration. Marker bubble grew from 36 px to 40 px. Published to fishpulse-v2 (Live Mode).
* **2026-10-16:** Cut the species list to 4 (Bass, Trout, Salmon, Catfish) and added a "More species coming soon!" hint, replacing the expandable "+N more" chip. Demo seeds and the simulator use the same 4. Published to fishpulse-v2 (Live Mode).
* **2026-10-16:** Report form now shows 4 popular species plus a "+N more" chip. Documented that the whole app is English-only. Published to fishpulse-v2 (Live Mode).
* **2026-10-16:** Connected Supabase (project `unqtvmligccaduzrhixs`) and switched fishpulse-v2 to Live Mode. Added `npm run test:live`, and the realtime client now sets its auth token explicitly after sign-in.
* **2026-10-16:** Bright "Sunny Lake" redesign with a cute fish mascot, ripples and bubbles, and a new celebration. Added the bottom tab bar (Map / Community / Chat, the latter two "coming soon"). Published to the new URL fishpulse-v2.vercel.app; the old dark build stays at fishpulse-demo.vercel.app.
* **2026-10-16:** Deployed to Vercel (fishpulse-demo). Added the double-click launchers. Demo seeds now refill on load.
* **2026-10-16:** Initial MVP covering the map, report flow, notifications, expiry, Demo and Live adapters, migration, and docs.
