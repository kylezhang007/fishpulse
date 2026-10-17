# 🎣 FishPulse

**Find the fish. Alert your crew. Fish together.**

FishPulse is a real-time, community fishing map. When the fish start biting, one tap tells every angler nearby: a cartoon fish pops up on everyone's map, live, with ripples and a "Your bro found fish!" alert. Reports fade after 30 minutes, because fishing intel goes stale fast.

**▶ Try it live: [fishpulse-v2.vercel.app](https://fishpulse-v2.vercel.app)** (works best on a phone)

---

## The problem

Fishing tips today are slow and scattered: group chats, forum posts from last week, a friend's text an hour too late. By the time you hear "they're biting at the point", they've stopped. Anglers need **live, local, trusted** signals from people they actually fish with.

## What FishPulse does

| | Feature | What it means |
| --- | --- | --- |
| 🗺️ | **Live hotspot map** | Share a spot in 3 taps (species, how lively, an optional note). It appears on every open map in under a second. |
| 🫧 | **Privacy by default** | "Rough area" mode snaps your pin to a ~300 m cell, so you never give away your secret spot. |
| 🧭 | **One-tap navigation** | Any hotspot opens Google Maps directions straight to the water. |
| 📷 | **AI Fish ID** | Snap a photo of your catch and AI (Fishial.ai) identifies the species. |
| 🃏 | **Catch cards** | Each catch becomes a collectible card: photo, species, place name, AI confidence, and a Wikipedia link. |
| 🌊 | **Community "Ocean"** | Shared catch cards float up from an animated sea. Like them and tap anyone to see their profile. |
| 🤝 | **Friends & live chat** | Add an angler from their profile. Once they accept, chat 1:1 in real time with quick replies like "🎣 Heading over!". |
| 👤 | **Profiles & badges** | Each angler has a profile with stats, badges, and a wall of catch cards. |

## How to try it

1. Open **[fishpulse-v2.vercel.app](https://fishpulse-v2.vercel.app)** on your phone.
2. Tap **No code? Continue as a guest →** to explore the map, the Ocean, and profiles.
3. To post spots, identify fish, and chat, **join with a member invite code**. Ask the team for one at the demo.

Tip: open it on two devices side by side and share a spot on one. Watch it ripple onto the other.

## How it's built

```
React 19 + TypeScript + Vite ─┬─ MapLibre GL (map) + Motion (animations) + Tailwind v4
                              │
Supabase ─────────────────────┼─ Postgres + Row-Level Security (every permission enforced in the database)
                              ├─ Realtime (live spots, posts, friend requests, messages)
                              ├─ Anonymous auth + invite-code membership
                              ├─ Storage (catch photos)
                              └─ Edge Function → Fishial.ai (API keys never reach the browser)
Vercel ───────────────────────── static hosting
```

* **Secure by design.** Guests can only read. Only friends can message each other. Nobody can forge, edit, or delete someone else's report. Every rule lives in Postgres RLS, not just the UI.
* **Tested.** 34 unit tests, plus a 33-check live test that simulates multiple devices against the real backend: realtime delivery, permissions, and chat privacy.
* **Demo Mode.** The whole app also runs offline with simulated anglers, so the demo never depends on Wi-Fi.

## What's next

* Fishing crews (group chat) and "notify me within N km" alerts
* Push notifications and an installable app (PWA)
* Comments on catches, plus reporting and moderation tools
* More species beyond Bass, Trout, Salmon, and Catfish

---

<sub>Built at a hackathon by the FishPulse team. FishPulse shows what anglers report; it doesn't verify catches. Team & developer docs: [`README_AI.md`](README_AI.md) · [`docs/`](docs/)</sub>
