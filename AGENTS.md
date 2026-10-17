# AGENTS.md — handoff notes for AI coding assistants

Read this before you change anything in FishPulse. It captures the team's rules, the live setup, and the traps we already hit.
Humans: the README is the full manual. This file is the short version for an AI picking up the work.

## 1. What this is

FishPulse is a real-time, community fishing map built as a hackathon demo, which may become a portfolio piece later.
Users share "fish are biting here" spots. Everyone's map updates live, with cute animations. Members can photograph a catch,
have it identified by AI (Fishial.ai), and collect a "catch card".

* **Live site:** https://fishpulse-v2.vercel.app (Live Mode, Supabase).
* **Backup site:** https://fishpulse-demo.vercel.app (old dark theme, Demo Mode, frozen; don't redeploy it).
* **Owner:** kyle. **Talk to the owner in Chinese (中文).** The **app UI is English-only**; keep all user-facing text in English.

## 2. Hard rules (do not break)

1. **Update `README.md` in the same change, every time.** That includes any feature, config, migration, deploy, or URL change, plus a dated line in the README **Changelog**. If architecture or the roadmap changes, also update `docs/ARCHITECTURE.md` and `docs/ROADMAP.md`. The owner asked for this explicitly.
2. **Never commit secrets or access codes.** Docs use placeholders `<MEMBER_INVITE_CODE>` and `<ADMIN_CODE>`; the real values live in the git-ignored `CODES.local.md` and in the database. `.env` is git-ignored. Before committing, run `grep -rn "SMOKETEST-\|sb_secret\|service_role" --exclude-dir=node_modules .` and make sure the real invite or admin codes aren't in the diff.
3. **Never put server secrets in `VITE_*` variables.** Those are shipped to the browser. Only the Supabase **publishable** key goes there. The Fishial keys live only in Supabase → Edge Functions → Secrets (`FISHIAL_CLIENT_ID`, `FISHIAL_CLIENT_SECRET`).
4. **Fishial credits cost money:** 200 per month. Every real Fish ID call uses one. Develop and test with **Demo Mode** (simulated recognition). Make a real call only when the owner agrees, and say how many credits you used.
5. **Don't wipe or edit live data** (`fishing_spots`, `catches`, `profiles`, `invite_codes`) without asking. Teammates may be using the live site.
6. **Ask before outward-facing actions:** publishing to Vercel, pushing to GitHub, and running SQL on the live project. When the owner says "发布", deploy with the script in §5.
7. **Keep it a demo:** prefer the simplest thing that works. Don't add placeholder buttons that do nothing; use an honest "coming soon" instead.
8. **The species list is intentionally 4:** Bass, Trout, Salmon, and Catfish, each with a custom cartoon icon in `SpeciesIcon.tsx`. The UI says "More species coming soon!".

## 3. Environment

* Node 22 is at `~/.local/node/bin`. Prefix commands with `export PATH=$HOME/.local/node/bin:$PATH`.
* Project root: `~/Documents/FishPulse/fishpulse`.
* Commands: `npm run dev`, `npm run typecheck`, `npm test` (Vitest, 33 tests), `npm run build`, and `npm run test:live` (21 checks against real Supabase; needs `SMOKE_INVITE_CODE` in `.env`; uses no Fishial credits).
* Demo Mode server without touching live data: `VITE_DATA_MODE=demo node node_modules/vite/bin/vite.js --port 5175`.
* Double-click launchers: `打开FishPulse.command` (local preview) and `更新网上Demo.command` (deploy to fishpulse-v2).

## 4. Architecture in one screen

```
src/app/App.tsx                 UI state: tabs (map/community/chat/me), sheets, account, Fish ID, cards
src/components/map/             MapLibre map, markers (React portals into Marker elements), picker, theme re-tint
src/components/animations/      FishIcon mascot, SpeciesIcon (4 species), ripples/bubbles, celebration, notifications
src/components/fishing/         ReportForm, SpotDetailCard, TopBar, BottomBar, ActivityIndicator
src/components/account/         WelcomeScreen, JoinForm, MembersOnlySheet, ProfileScreen (Me page + admin tools)
src/components/fishid/          FishIdSheet (camera → compress → place → identify), CatchCardView
src/components/community/       CommunityScreen (ocean), PostBubble (floating post), ShareCatchSheet
src/services/                   FishingSpotService + ProfileService + FishIdService; mock (demo) & supabase (live)
src/domain/                     pure, tested helpers (expiry, dedup, validation, privacy snapping, avatars, images, place)
supabase/migrations/            run IN ORDER in Dashboard → SQL Editor (all already applied on the live project)
supabase/functions/identify-fish/   Deno Edge Function: auth + quota + Fishial + storage + catches insert
scripts/live-smoke-test.mjs     real-backend checks (accounts, RLS, realtime, admin guard)
```

* **Roles:** `guest` (browse only), `member` (shared invite code, 25 seats), `admin` (admin code, 5 devices, unlimited Fish ID, "Clear all hotspots"). These are enforced in the DB through RLS and security-definer RPCs, not just the UI.
* **Realtime:** `postgres_changes` INSERT on `fishing_spots`, plus a `fishpulse-control` broadcast channel whose "refresh" event makes every page re-fetch (used after the admin clears data).
* **Quotas:** `app_settings` holds `fishid_member_monthly` = 5 and `fishid_global_monthly` = 180. Usage is logged in `fish_id_requests`.

## 5. Live infrastructure

* **Supabase project:** `unqtvmligccaduzrhixs` (US West, free plan). Access is through the owner's dashboard in Chrome; there is no CLI login. Run SQL by pasting it into the SQL Editor. Deploy the Edge Function through Dashboard → Edge Functions → identify-fish → Code.
* **Vercel:** `更新网上Demo.command` builds with the local `.env` and runs `vercel deploy --prod --project fishpulse-v2` from `../deploy-v2/` (outside the repo). Vite bakes env vars in at **build** time.
* **GitHub:** private repo `fishpulse`. It may go public later as a portfolio piece, which is why rule 2 matters.

## 6. Traps we already hit (save yourself time)

* MapLibre v6 needs `setWorkerUrl(...?url)` (`maplibreSetup.ts`), or the map never loads under Vite.
* `maplibre-gl.css` forces `.maplibregl-map { position: relative }`, so size the map via a wrapper div, not on the container.
* Tailwind v4: custom classes used in `@apply` must be declared with `@utility` (see `glass`). Plain CSS classes such as `.chip` are unlayered and **override** Tailwind utility classes, so use inline `style` to override them.
* Location picking must use the **pin's screen point** (`getPinLocation()` / `focusPoint`), never `map.getCenter()`. Camera padding is async, and the two drift apart by tens of pixels.
* The header measurement effect must re-run when the tab changes (the header unmounts on other tabs).
* Exiting overlays should set `exit={{ pointerEvents: "none" }}` so a fading layer never blocks taps.
* The desktop app's browser pane can throttle rendering to about 1 fps. Then ResizeObserver, animations, and screenshots lag, so trust DOM and JS checks over screenshots.
* Supabase dashboard forms (React) ignore values set by script. Type into them with real keystrokes. Secret **names** must match exactly.
* Vercel deploys must run from `../deploy-v2` (**outside** the git repo). Inside the repo, the CLI attaches the git author and the Hobby plan marks the deploy **Blocked**.
* Never run Perl `s|…|…|` substitutions on TypeScript that contains `|` (union types). That broke code twice; use a Node script with exact string replacement.

## 7. What's next (owner-approved plan)

* **Phase C, Community ("The Ocean")** is done. Next candidates: Chat, comments on posts, and photo moderation (report button plus admin delete).
* Open items: real-phone test (iPhone Safari, Android Chrome); a moderation path for photos; removing deleted spots from open clients instantly (DELETE events); a QR code for the demo; and, before going public, an admin code that differs from the admin display name.
