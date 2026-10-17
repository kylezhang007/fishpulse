# FishPulse architecture

## Layers

```
┌────────────────────────── Application layer ─────────────────────────────┐
│ app/App.tsx: UI state (mode, selection, filter, sheets, notifications)   │
│ components/fishing/*: ReportForm, SpotDetailCard, TopBar, BottomBar      │
│ components/ui/*: BottomSheet, TabBar (Map/Community/Chat), ComingSoon     │
└───────▲───────────────────────────▲─────────────────────────────▲────────┘
        │ props / callbacks         │ props / callbacks           │ hook API
┌───────┴─────────┐   ┌─────────────┴──────────────┐   ┌──────────┴─────────┐
│ Map layer       │   │ Animation layer            │   │ Data layer         │
│ FishingMap      │   │ SonarPulse                 │   │ useFishingSpots    │
│ HotspotMarker   │   │ FishDiscoveryAnimation     │   │ FishingSpotService │
│ LocationPicker  │   │ FishingNotificationStack   │   │  ├ Mock (demo)     │
│ mapStyle        │   │ FishIcon                   │   │  └ Supabase (live) │
│ (MapLibre only) │   │ (props in, no data access) │   │ spotRecord mapping │
└─────────────────┘   └────────────────────────────┘   └────────────────────┘
                    domain/*: pure, tested logic (expiry, dedup,
                    classification, validation, privacy snapping)
```

* **The map layer** imports MapLibre and nothing from `services/`. It gets `spots`, `arrivals`, and `selectedId` and emits `onSelectSpot`. Through a ref it exposes `flyTo` and `getCenter`.
* **The animation layer** is purely presentational and reacts to props such as `arrival`, `color`, and `items`.
* **The data layer** hides the backend behind `FishingSpotService` (`src/services/fishingSpotService.ts`). `services/index.ts` is the only place that picks an adapter. Both modes run the exact same UI.
* **`domain/`** holds framework-free logic, which is where most of the unit tests live.

## Data flow

```
service.subscribeToSpots ─┐
service.getSpots (initial)├─► useFishingSpots.ingest(spots, source)
service.createSpot (own) ─┘        │ 1. drop expired
                                   │ 2. SeenRegistry.markIfNew(id)  ← dedup
                                   │ 3. mergeSpots → state
                                   └─► classifyArrival → onArrival(spot, kind)
                                                          │
App.handleArrival ◄───────────────────────────────────────┘
  ├ arrivals[id] = kind (cleared after ARRIVAL_MS) → HotspotMarker animation
  └ kind === "discovery" && not notified → notification card
```

### Arrival kinds (animation triggers)

| kind | when | visual |
| --- | --- | --- |
| `initial` | first load | quiet staggered scale-in |
| `own` | this device published (via insert response **or** a realtime echo that wins the race) | leaping fish + particles → sonar burst → marker |
| `discovery` | someone else's report, < 3 min old | 3-ring sonar burst + flash + notification |
| `quiet` | late backfill of an older report (e.g. after reconnect) | quiet entrance, no notification |

Own-report detection: the client generates the UUID (`domain/id.ts`) and registers it in `ownIds` **before** the insert. When the realtime echo arrives first, it's still recognized as "own". The insert payload carries the same id, which also makes it idempotent.

## Realtime handling (Live Mode)

* `postgres_changes` INSERT on `public.fishing_spots`. RLS applies to realtime, so a client only receives active rows it's allowed to read.
* We subscribe **before** the initial fetch. Anything that arrives in between is deduped by id.
* After sign-in the adapter calls `realtime.setAuth()` explicitly, so the socket carries the user token before the channel joins.
* Status maps to `connecting | live | reconnecting | offline`. On `CHANNEL_ERROR`, `TIMED_OUT`, or `CLOSED`, the adapter rebuilds the channel with exponential backoff (1 s → 30 s). Callbacks from replaced channels are ignored.
* **Catch-up:** on every transition back to `live`, and on `visibilitychange` or `online`, we run one `getSpots()` backfill. Mobile Safari suspends background sockets.
* **Fallback polling** runs every 20 s *only* while realtime isn't `live`.
* **Expiry:** the `expiresAt` timestamp is the source of truth. A 10 s timer re-evaluates it, and the DB policy hides expired rows server-side. Markers fade as reports age (`spotFreshness`).

## Markers and performance

* Each spot is a real `maplibregl.Marker` whose DOM element hosts a React portal (`FishingMap.hostFor`). MapLibre positions it with a GPU transform each frame, so the sonar rings stay locked to the coordinate during pan and zoom with no per-frame React work.
* Ring animations use only `transform` and `opacity`. Bursts play once. Only *high*-activity spots run a single slow idle ring.
* `prefers-reduced-motion`: `MotionConfig reducedMotion="user"`, CSS overrides, `jumpTo` instead of `flyTo`, and no leaping fish.
* For hundreds of spots, switch to a GeoJSON source with clustering plus a symbol layer, and keep DOM markers for the selected or fresh ones only.

## Location privacy

* Geolocation is **one-shot and user-initiated** (`useGeolocation`). It never watches or tracks, and the "you are here" dot never leaves the device.
* The report location is the map centre under the crosshair, which the user chooses.
* **Approximate** is the default: it snaps to the centre of a fixed ~300 m grid cell (`approximateLocation`). Deterministic snapping can't be averaged back to the exact spot. Only the snapped coordinate is sent or stored, and the UI labels it "≈ Approximate area".

## Security model

* Browser bundle: anon/publishable key only.
* `creator_id`, `created_at`, and `expires_at` are set or clamped by a `security definer` trigger from `auth.uid()`.
* RLS allows SELECT of active rows to `anon, authenticated` and INSERT only where `creator_id = auth.uid()`. There are no UPDATE or DELETE policies, and those privileges are revoked.
* DB `CHECK` constraints validate coordinates, activity level, text lengths, and the expiry window.
* Abuse: a client cooldown (UX) plus a server limit of 5 per user per minute. Anonymous users can create new identities, so see the limitations doc.

## Extending

* **New backend:** implement `FishingSpotService` and select it in `services/index.ts`.
* **Photos, comments, votes, RSVP:** add tables keyed by `fishing_spots.id`, and extend `FishingSpot` with optional fields mapped in `spotRecord.ts`.
* **Profiles and friends:** anonymous users can be upgraded in place with `supabase.auth.updateUser`/`linkIdentity`, keeping the same `creator_id`.
* **Geo-notifications and bbox queries:** add PostGIS `geography(Point)` plus a GiST index and a `spots_in_bbox` RPC. Realtime filters can then key on a region id.

## Visual theme

The bright "Sunny Lake" theme lives in two places:

* `src/styles/index.css` holds the design tokens (`@theme`), surfaces (`glass`), buttons, and all CSS keyframes (ripples, bubbles, bobbing, CTA pulse).
* `src/components/map/mapStyle.ts` re-tints the vector basemap at runtime (OpenFreeMap `positron` by default) by matching layer ids, so any OpenMapTiles-schema provider can be swapped in.

Activity colours, labels, and emoji come from `ACTIVITY_META` in `src/types/fishing.ts`, the single source for markers, forms, and cards.

## Navigation

`App.tsx` owns a `tab` state (`map | community | chat`). The map stays mounted under the other tabs, so its camera and state survive switching. Community renders `CommunityScreen` (the Ocean); Chat renders `ChatScreen` (friend requests + conversations) with `ConversationView` on top, driven by `useSocial` and the `SocialService` (`friendships` + `messages` tables, realtime on both). Notifications float above every tab, and **View Spot** switches back to the map.

## Location picking: one source of truth

The pin is drawn at a **focus point**: the centre of the area between the top chrome and the bottom sheet, computed from the measured insets. The published location is `map.unproject(focusPoint)` via `FishingMapHandle.getPinLocation()`. It is *not* `map.getCenter()`, because camera padding is applied asynchronously (it waits for in-flight moves to end), and the two used to drift apart by tens of pixels. Tap-to-move (`panBy`), `flyTo` (which passes the current padding), and the rough-area preview all use the same focus point. After a successful publish, `holdViewOnNextInsetChange()` re-pads the camera with `jumpTo` around the current focus point, so the scene doesn't slide when the sheet closes.

## Accounts

`ProfileService` (`src/services/profileService.ts`) is implemented by both adapters next to `FishingSpotService`. In Live Mode, profiles live in `public.profiles` (public read, **no** client writes). All writes go through security-definer RPCs: `register_guest` (auto `Guest-####`), `register_member(code, name, colour)` (validates the shared code in `invite_codes`, the 25-seat cap, and name uniqueness via a unique index on `lower(btrim(display_name))`, then upgrades in place), `is_name_available`, and `profile_stats`. The hotspot INSERT policy requires `profiles.role = 'member'`. `useMyProfile` drives the welcome screen. `useProfiles` batches public profiles for marker avatars and profile pages. Avatars are initials on a colour from `colorForName`.

## Fish ID

`FishIdService` (`src/services/fishIdService.ts`) is implemented by both adapters. Live mode calls the Supabase Edge Function `identify-fish` (`supabase/functions/identify-fish/index.ts`, Deno) with the raw JPEG plus an `x-place` header. The function uses the service role to verify the user (`auth.getUser`), checks `profiles.role`, enforces quotas from `fish_id_requests` and `app_settings`, calls Fishial with secrets held server-side (token cached about 9 minutes), uploads to the `catch-photos` bucket, and inserts into `catches`. Clients can only *read* `catches` (RLS) and call `fishid_quota()`. UI: `FishIdSheet` (camera, compression, place name, scan state) → `CatchCardView` (flip-in card); the Me page grid reads `getCatches(userId)`.
