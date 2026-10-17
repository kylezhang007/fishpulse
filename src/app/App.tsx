import { AnimatePresence, MotionConfig } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FishingNotificationStack, type NotificationItem } from "../components/animations/FishingNotification";
import { BottomBar } from "../components/fishing/BottomBar";
import { ReportForm, type ReportFormValues } from "../components/fishing/ReportForm";
import { SpotDetailCard } from "../components/fishing/SpotDetailCard";
import { TopBar } from "../components/fishing/TopBar";
import { FishingMap, type FishingMapHandle } from "../components/map/FishingMap";
import { MapControls } from "../components/map/MapControls";
import { MembersOnlySheet } from "../components/account/MembersOnlySheet";
import { ProfileScreen } from "../components/account/ProfileScreen";
import { WelcomeScreen } from "../components/account/WelcomeScreen";
import { CommunityScreen } from "../components/community/CommunityScreen";
import { ShareCatchSheet } from "../components/community/ShareCatchSheet";
import { CatchCardView } from "../components/fishid/CatchCardView";
import { useCommunity } from "../hooks/useCommunity";
import { FishIdSheet } from "../components/fishid/FishIdSheet";
import { ComingSoon } from "../components/ui/ComingSoon";
import { TabBar, type TabId } from "../components/ui/TabBar";
import { Toast, type ToastMessage } from "../components/ui/Toast";
import { APPROXIMATE_GRID_METERS, approximateLocation } from "../domain/location";
import { useCooldown } from "../hooks/useCooldown";
import { useFishingSpots } from "../hooks/useFishingSpots";
import { useGeolocation } from "../hooks/useGeolocation";
import { useMyProfile, useProfiles } from "../hooks/useProfile";
import { useNow } from "../hooks/useNow";
import { config } from "../lib/config";
import { createFishingSpotService } from "../services";
import type { CatchCard, FishingSpot, LatLng, Profile, SpotArrival } from "../types/fishing";

/** How long each arrival kind keeps its entrance animation flag. */
const ARRIVAL_MS: Record<SpotArrival, number> = { initial: 1600, quiet: 1200, discovery: 3600, own: 3800 };
const MAX_NOTIFICATIONS = 3;
/** Action row + tab bar height, so the map keeps its focus point above them. */
const BOTTOM_BAR_INSET = 150;

type Mode = "browse" | "report";

/** The same snapping the report uses, so the picker preview matches the published point. */
const snapToPrivacyCell = (p: LatLng) => ({ center: approximateLocation(p), radiusMeters: APPROXIMATE_GRID_METERS / 2 });

/**
 * APPLICATION LAYER. Owns UI state and wires the data hook to the map,
 * animations and cards. Contains no backend- or MapLibre-specific code.
 */
export function App() {
  const service = useMemo(() => createFishingSpotService(config), []);
  const mapRef = useRef<FishingMapHandle>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const now = useNow(15_000);

  const [tab, setTab] = useState<TabId>("map");
  const [mode, setMode] = useState<Mode>("browse");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [arrivals, setArrivals] = useState<Record<string, SpotArrival>>({});
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const notified = useRef(new Set<string>());
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [filter, setFilter] = useState("all");
  const [approximate, setApproximate] = useState(true); // privacy by default
  const [sheetHeight, setSheetHeight] = useState(0);
  const [topInset, setTopInset] = useState(80);
  const [simulating, setSimulating] = useState(false);
  const account = useMyProfile(service);
  const { profile: me, isMember } = account;
  const [membersOnly, setMembersOnly] = useState<string | null>(null); // feature name a guest tried to use
  const [fishIdOpen, setFishIdOpen] = useState(false);
  const [openCard, setOpenCard] = useState<{ card: CatchCard; fresh: boolean; owner?: Profile } | null>(null);
  const [shareOpen, setShareOpen] = useState<{ preselect?: string } | null>(null);
  const [cardsVersion, setCardsVersion] = useState(0);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const checkName = useCallback((n: string) => service.isNameAvailable(n), [service]);
  const { state: geo, locate } = useGeolocation();
  const cooldown = useCooldown(config.submitCooldownSeconds);

  const showToast = useCallback((tone: ToastMessage["tone"], text: string) => {
    setToast({ id: Date.now(), tone, text });
  }, []);

  const joinAsMember = useCallback(
    async (code: string, name: string) => {
      const p = await account.join(code, name);
      setMembersOnly(null);
      showToast("success", `Welcome aboard, ${p.displayName}! 🎉`);
      return p;
    },
    [account, showToast],
  );


  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // ── animation trigger system: data events → transient animation flags ──
  const handleArrival = useCallback((spot: FishingSpot, arrival: SpotArrival) => {
    setArrivals((a) => ({ ...a, [spot.id]: arrival }));
    setTimeout(() => {
      setArrivals((a) => {
        if (!(spot.id in a)) return a;
        const next = { ...a };
        delete next[spot.id];
        return next;
      });
    }, ARRIVAL_MS[arrival]);

    if (arrival === "discovery" && !notified.current.has(spot.id)) {
      notified.current.add(spot.id);
      setNotifications((n) => [{ id: spot.id, spot }, ...n].slice(0, MAX_NOTIFICATIONS));
      navigator.vibrate?.(30);
    }
  }, []);

  const community = useCommunity(service, tab === "community", (p) => {
    if (p.userId !== me?.id) showToast("info", `🐟 New catch from ${p.author?.displayName ?? "an angler"}!`);
  });

  const { spots, loadState, loadError, connection, createSpot, retry, simulate } = useFishingSpots(service, {
    ttlMinutes: config.reportTtlMinutes,
    onArrival: handleArrival,
  });

  const profiles = useProfiles(service, [...spots.map((s) => s.creatorId), viewingProfileId ?? undefined], me);
  const viewingProfile = viewingProfileId ? profiles[viewingProfileId] : null;

  const visibleSpots = useMemo(() => (filter === "all" ? spots : spots.filter((s) => s.fishType === filter)), [spots, filter]);
  const selectedSpot = spots.find((s) => s.id === selectedId) ?? null;

  useEffect(() => {
    if (config.configWarning) showToast("info", config.configWarning);
  }, [showToast]);

  // Measure the top chrome so the camera centre sits in the visible map area.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    setTopInset(el.getBoundingClientRect().bottom + 8);
    // The header only exists on the map tab, so re-attach whenever we come back to it.
    const ro = new ResizeObserver(() => setTopInset(el.getBoundingClientRect().bottom + 8));
    ro.observe(el);
    return () => ro.disconnect();
  }, [tab]);

  // ── interactions ─────────────────────────────────────────────────────────
  const focusSpot = useCallback((spot: FishingSpot) => {
    setMode("browse");
    setSelectedId(spot.id);
    mapRef.current?.flyTo({ lat: spot.latitude, lng: spot.longitude }, { zoom: 13 });
  }, []);

  const handleSelect = useCallback(
    (id: string | null) => {
      if (mode === "report") return; // the map is a location picker right now
      if (!id) return setSelectedId(null);
      const spot = spots.find((s) => s.id === id);
      if (spot) focusSpot(spot);
    },
    [mode, spots, focusSpot],
  );

  const dismissNotification = useCallback((id: string) => setNotifications((n) => n.filter((x) => x.id !== id)), []);

  const viewFromNotification = useCallback(
    (item: NotificationItem) => {
      dismissNotification(item.id);
      const spot = spots.find((s) => s.id === item.id);
      if (!spot) return showToast("info", "That report has already expired.");
      setTab("map");
      if (filter !== "all" && filter !== spot.fishType) setFilter("all");
      focusSpot(spot);
    },
    [dismissNotification, spots, filter, focusSpot, showToast],
  );

  const startReport = () => {
    if (!isMember) {
      setMembersOnly("Sharing spots");
      return;
    }
    setSelectedId(null);
    setMode("report");
  };

  const locateMe = async () => {
    const pos = await locate();
    if (pos) mapRef.current?.flyTo(pos, { zoom: 14 });
  };

  const submitReport = async (values: ReportFormValues) => {
    const center = mapRef.current?.getPinLocation();
    if (!center) throw new Error("The map isn't ready yet.");
    const point = approximate ? approximateLocation(center) : center;
    await createSpot({
      latitude: point.lat,
      longitude: point.lng,
      username: me?.displayName ?? "Angler",
      fishType: values.fishType,
      activityLevel: values.activityLevel,
      note: values.note,
      isApproximate: approximate,
    });
    // Only reached after the backend confirmed the save.
    mapRef.current?.holdViewOnNextInsetChange(); // the new spot stays exactly where it was placed
    cooldown.start();
    setMode("browse");
    showToast("success", service.mode === "live" ? "Spot shared! Your crew can see it" : "Spot shared! (Demo · this browser only)");
  };

  const runSimulation = async () => {
    if (!simulate) return;
    setSimulating(true);
    try {
      await simulate();
    } finally {
      setSimulating(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (mode === "report") setMode("browse");
      else setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode]);

  const sheetOpen = mode === "report" || selectedSpot !== null || membersOnly !== null || fishIdOpen || shareOpen !== null;
  const bottomInset = sheetOpen ? sheetHeight : BOTTOM_BAR_INSET;
  const userLocation = geo.status === "ok" ? geo.position : null;
  const showSimulator = service.mode === "demo" && config.enableSimulator && simulate ? runSimulation : undefined;

  return (
    <MotionConfig reducedMotion="user">
      <main className="fixed inset-0 overflow-hidden bg-cream text-ink">
        <FishingMap
          ref={mapRef}
          styleUrl={config.mapStyleUrl}
          initialCenter={config.defaultCenter}
          initialZoom={config.defaultZoom}
          spots={visibleSpots}
          profiles={profiles}
          arrivals={arrivals}
          selectedId={selectedId}
          now={now}
          topInset={topInset}
          bottomInset={bottomInset}
          picking={mode === "report"}
          pickSnap={approximate ? snapToPrivacyCell : undefined}
          userLocation={userLocation}
          onSelectSpot={handleSelect}
        />

        {/* top chrome (map tab) */}
        {tab === "map" && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-[calc(env(safe-area-inset-top)+10px)]">
            <div ref={headerRef} className="pointer-events-auto mx-auto max-w-lg">
              <TopBar mode={service.mode} connection={connection} activeCount={spots.length} syncScope={service.syncScope} />
            </div>
            <div className="mx-auto max-w-lg" style={{ marginTop: 8 + notifications.length * 80 }}>
              {loadState === "error" && (
                <div className="glass pointer-events-auto flex items-center justify-between gap-3 rounded-3xl px-3.5 py-2 text-sm font-bold" role="alert">
                  <span className="text-[#d6455d]">😵 {loadError ?? "Couldn't load reports."}</span>
                  <button className="btn-secondary" onClick={() => void retry()}>
                    Retry
                  </button>
                </div>
              )}
              {loadState === "loading" && (
                <div className="glass mx-auto flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold text-ink-soft" role="status">
                  <span className="fp-loader fp-loader--sm" /> Looking for fish…
                </div>
              )}
              {loadState === "ready" && visibleSpots.length === 0 && mode === "browse" && (
                <div className="glass mx-auto w-fit rounded-full px-3 py-1.5 text-xs font-bold text-ink-soft">
                  {filter === "all" ? "No fish reported yet — be the first! 🎣" : `No ${filter} reports right now 🐟`}
                </div>
              )}
            </div>
          </div>
        )}

        {/* right controls */}
        {tab === "map" && !sheetOpen && (
          <div className="absolute right-3 z-20" style={{ top: topInset + 4 + notifications.length * 80 }}>
            <MapControls
              geo={geo}
              onLocate={() => void locateMe()}
              onRecenter={() => mapRef.current?.flyTo(config.defaultCenter, { zoom: config.defaultZoom, exactZoom: true })}
            />
          </div>
        )}

        {/* other tabs (not built yet) */}
        <AnimatePresence>
          {tab === "chat" && <ComingSoon key={tab} tab={tab} onBack={() => setTab("map")} />}
          {tab === "community" && (
            <CommunityScreen
              key="community"
              posts={community.posts}
              loading={community.loading}
              error={community.error}
              freshIds={community.freshIds}
              now={now}
              canShare={isMember}
              onShare={() => (isMember ? setShareOpen({}) : setMembersOnly("Sharing to the community"))}
              onOpenProfile={(id) => setViewingProfileId(id)}
              onOpenCard={(p) => setOpenCard({ card: p.card, fresh: false, owner: p.author })}
              onLike={(p) => {
                if (!isMember) return setMembersOnly("Liking catches");
                community.toggleLike(p).catch((e) => showToast("error", e instanceof Error ? e.message : "Couldn't like."));
              }}
              onRetry={() => void community.reload()}
            />
          )}
          {tab === "me" && me && (
            <ProfileScreen
              key="me"
              profile={me}
              isMe
              service={service}
              onJoin={joinAsMember}
              cardsVersion={cardsVersion}
              onOpenCard={(card) => setOpenCard({ card, fresh: false })}
              onAdminClear={account.isAdmin && service.adminClearSpots ? () => service.adminClearSpots!() : undefined}
            />
          )}
          {viewingProfile && (
            <ProfileScreen
              key={`p-${viewingProfile.id}`}
              profile={viewingProfile}
              isMe={viewingProfile.id === me?.id}
              service={service}
              cardsVersion={cardsVersion}
              onOpenCard={(card) => setOpenCard({ card, fresh: false })}
              onBack={() => setViewingProfileId(null)}
            />
          )}
        </AnimatePresence>

        {/* notifications float above every tab, so nobody misses a bite */}
        <div
          className="pointer-events-none absolute inset-x-0 z-30 px-3"
          style={{ top: tab === "map" ? topInset : "calc(env(safe-area-inset-top) + 12px)" }}
        >
          <div className="mx-auto max-w-lg">
            <FishingNotificationStack items={notifications} onView={viewFromNotification} onDismiss={dismissNotification} />
          </div>
        </div>

        {/* bottom chrome */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
          <div className="mx-auto mb-2.5 max-w-lg px-3">
            <Toast toast={toast} />
          </div>
          {tab === "map" && !sheetOpen && (
            <div className="pointer-events-auto mx-auto mb-2.5 max-w-lg px-3">
              <BottomBar filter={filter} onFilterChange={setFilter} onReport={startReport} onSimulate={showSimulator} simulating={simulating} />
            </div>
          )}
          {!sheetOpen && (
            <TabBar
              active={tab}
              onChange={(t) => {
                setViewingProfileId(null);
                setTab(t);
              }}
              onScan={() => (isMember ? setFishIdOpen(true) : setMembersOnly("Fish ID"))}
              scanLocked={!isMember}
            />
          )}
        </div>

        <AnimatePresence>
          {mode === "report" && (
            <ReportForm
              key="report"
              approximate={approximate}
              onApproximateChange={setApproximate}
              onUseMyLocation={() => void locateMe()}
              geo={geo}
              cooldownRemaining={cooldown.remaining}
              onSubmit={submitReport}
              onCancel={() => setMode("browse")}
              onHeightChange={setSheetHeight}
            />
          )}
          {mode === "browse" && selectedSpot && (
            <SpotDetailCard
              key="detail"
              spot={selectedSpot}
              now={now}
              userLocation={userLocation}
              onViewSpot={() => focusSpot(selectedSpot)}
              reporter={selectedSpot.creatorId ? profiles[selectedSpot.creatorId] : undefined}
              onOpenProfile={(id) => setViewingProfileId(id)}
              onClose={() => setSelectedId(null)}
              onHeightChange={setSheetHeight}
            />
          )}
          {membersOnly && (
            <MembersOnlySheet
              key="members-only"
              feature={membersOnly}
              onJoin={joinAsMember}
              checkName={checkName}
              onClose={() => setMembersOnly(null)}
              onHeightChange={setSheetHeight}
            />
          )}
          {shareOpen && me && (
            <ShareCatchSheet
              key="share"
              service={service}
              userId={me.id}
              preselectId={shareOpen.preselect}
              onClose={() => setShareOpen(null)}
              onHeightChange={setSheetHeight}
              onShared={(post) => {
                setShareOpen(null);
                setViewingProfileId(null);
                setTab("community");
                community.injectPost(post, false);
                showToast("success", "Released into the ocean! 🌊");
              }}
            />
          )}
          {fishIdOpen && (
            <FishIdSheet
              key="fish-id"
              service={service}
              onClose={() => setFishIdOpen(false)}
              onHeightChange={setSheetHeight}
              onCard={(card) => {
                setFishIdOpen(false);
                setCardsVersion((v) => v + 1);
                setOpenCard({ card, fresh: true });
              }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {openCard && (
            <CatchCardView
              key={openCard.card.id}
              card={openCard.card}
              owner={openCard.owner ?? profiles[openCard.card.userId] ?? (openCard.card.userId === me?.id ? me : null)}
              onShare={
                isMember && me && openCard.card.userId === me.id
                  ? () => {
                      const id = openCard.card.id;
                      setOpenCard(null);
                      setShareOpen({ preselect: id });
                    }
                  : undefined
              }
              justCreated={openCard.fresh}
              onClose={() => setOpenCard(null)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {account.state === "onboarding" && (
            <WelcomeScreen key="welcome" onJoin={joinAsMember} onGuest={account.continueAsGuest} checkName={checkName} />
          )}
        </AnimatePresence>
      </main>
    </MotionConfig>
  );
}
