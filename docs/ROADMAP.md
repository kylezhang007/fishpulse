# Known limitations & roadmap

## Known limitations

### Not implemented (deliberately out of MVP scope)
* Accounts, profiles, and friends. "Your bro" means *any* other angler for now, with no friend graph.
* Photos, comments, reliability voting, RSVP ("I'm coming"), and share links.
* Push notifications while the app is closed. Notifications are in-app only.
* Editing or deleting your own report.
* Clustering for dense areas.

### Production hardening needed
* **Abuse:** anonymous sign-ins make throwaway identities cheap. The per-user DB rate limit doesn't stop a scripted attacker. Add Supabase Auth CAPTCHA (hCaptcha or Turnstile), IP rate limiting at the edge (Vercel middleware or an Edge Function that proxies inserts), profanity and spam filtering on `note`/`username`, and moderation tools.
* **`creator_id` visibility:** REST reads select explicit public columns, but Realtime `postgres_changes` payloads include the full row, so the random anonymous `creator_id` UUID reaches clients. It isn't PII and is never displayed, but a public launch should move to Realtime **Broadcast from the database** (a trigger that sends only public fields) or a view.
* **Map tiles:** OpenFreeMap is fair-use and donation-funded. Use a paid provider or self-hosted PMTiles for real traffic.
* **Realtime scale:** `postgres_changes` checks RLS per subscriber per event. At thousands of concurrent viewers, switch to Broadcast plus region channels.
* **Data volume:** the client loads up to 500 active spots and renders DOM markers. Add a bbox RPC and clustering past a few hundred.
* **Bundle size:** about 1.6 MB minified (~470 KB gzip), mostly MapLibre. Lazy-load the Supabase adapter and split vendor chunks.
* **Testing:** unit tests cover pure logic and the demo adapter, and the main flows were checked in a browser. There are no automated E2E tests (add Playwright) and no SQL tests (add pgTAP for RLS and the trigger).

### Verification status
* Live Mode is verified against the real Supabase project: `npm run test:live` passes 12/12, and the public site (fishpulse-v2) receives reports from another device in about 0.5–0.8 s.
* **No live delete events:** a report deleted by an admin in the SQL editor stays visible in open browsers until they reload or it expires. Subscribe to DELETE events, or add a `hidden` flag, before relying on moderation during a live event.
* **Moderation:** there is no admin UI, no profanity filter, and no report button yet.
* **Not tested yet:** physical iPhone Safari and Android Chrome. Only a mobile-sized desktop browser viewport was tested.

## Roadmap

### Agreed plan for the next phases (2026-10-17)

Decisions confirmed with the team lead:

* **Accounts:** shared invite code **`<MEMBER_INVITE_CODE>`**, stored in the DB (`invite_codes`), never in the bundle, and capped at **25 members**. Without a code, users are **guests** (auto name `Guest-1234`). Guests can only view the map, hotspots, community, and profiles. They **cannot** post hotspots, identify fish, create cards, post, or like. This is enforced in the DB and server, not just the UI.
* **Names:** entered once per device, unique (case-insensitive). Avatar is initials on a colour derived from the name.
* **Profile ("Me" tab):** avatar, name, member/guest badge, "Fishing career: 2 days" (fixed for the demo), join date and days in the community, stats, badges, and catch-card wall.
* **Bottom nav (5):** Map · Community · (◉ Fish ID, raised centre button, locked for guests) · Chat · Me.
* **Map:** hotspot markers and the detail card show the reporter's avatar and name, which link to their profile. The note shows as a speech bubble. Two quick messages: "🔥 They're biting!" and "🎣 Come fish with me!".
* **Fish ID:** Fishial.ai API v2 (`POST /v2/auth` → token valid 600 s, then `POST /v2/recognize` with the raw image). Keys live **server-side only**. **200 credits/month**, with **5 identifications per member per month** (25 × 5 = 125) and a global monthly cap. **Admins (code <ADMIN_CODE>) are exempt from all app-side caps.** **Admins (code <ADMIN_CODE>) are exempt from all app-side caps.** Scientific names map to the 4 icons by genus; other species get the generic icon. Dev uses a mock to save credits.
* **Catch card:** the identification photo, species and icon, date, "📍 place name" (GPS at capture → OpenStreetMap place name, never coordinates), AI confidence, and a Wikipedia link (by scientific name). Can be saved to the profile and shared to Community.
* **Community:** an X-like feed of shared cards with likes and photo zoom. Tap the avatar to open the profile.
* **Capacity (free tiers):** about 180 simultaneous viewers (Supabase realtime about 200). Members are limited by Fishial credits (25 × 5 per month). Storage (1 GB) fits about 300 members × 10 cards.
* **Phases:** **A** (accounts/guest, profile, avatars on the map, quick messages, 5-tab nav) ✅ → **B** (Fish ID + catch cards) ✅ live 2026-10-17 → **C** (Community "Ocean") ✅ 2026-10-17 → **D** (Friends + 1:1 Chat) ✅ built 2026-10-17 → next: comments, photo moderation, group crews.

### V1: Hackathon MVP (this build)
Real-time map, guest reports with species, activity, and notes, a 30-minute expiry, privacy-first approximate locations, sonar and discovery animations, and Demo plus Live adapters.

### V2: Social fishing network
* Upgrade guest accounts to full accounts (same id, keeps history).
* Friends and crews. "Your bro" becomes literal: notify only your crew, or everyone within N km.
* Web Push plus a PWA install, and geographic notification subscriptions (PostGIS radius).
* Photos (Supabase Storage with image moderation), comments, and an "I'm coming" RSVP.
* Reliability: 👍/👎 "still biting?" votes that extend or shorten `expires_at` and feed reporter reputation.
* Shareable spot links with OG previews.

### V3: Smart fishing platform
* Historical heatmaps: when and where species bite, aggregated and anonymized.
* Environmental overlays: weather, wind, water temperature, moon and solunar data, pressure trends.
* Personalized "good time to go" suggestions, and AI-assisted insights built on community history plus environmental data, clearly labelled as predictions and kept separate from live reports.
* Tackle shops, guides, and events as partner layers.
