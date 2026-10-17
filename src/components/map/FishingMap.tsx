import { AttributionControl, Map as MapLibreMap, Marker, type MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./maplibreSetup";
import { AnimatePresence } from "motion/react";
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { createPortal } from "react-dom";
import { spotFreshness } from "../../domain/spots";
import type { FishingSpot, LatLng, Profile, SpotArrival } from "../../types/fishing";
import { HotspotMarker } from "./HotspotMarker";
import { LocationPicker } from "./LocationPicker";
import { applyMarineTheme } from "./mapStyle";

export interface FishingMapHandle {
  flyTo(target: LatLng, opts?: { zoom?: number; exactZoom?: boolean }): void;
  /** The location under the picker pin — what a report published right now would use. */
  getPinLocation(): LatLng | null;
  /** The next inset change re-pads the camera without moving what is on screen (e.g. after publishing). */
  holdViewOnNextInsetChange(): void;
}

export interface FishingMapProps {
  ref?: Ref<FishingMapHandle>;
  styleUrl: string;
  initialCenter: LatLng;
  initialZoom: number;
  spots: FishingSpot[];
  /** Public profiles by user id, for reporter avatars on markers. */
  profiles?: Record<string, Profile>;
  arrivals: Record<string, SpotArrival>;
  selectedId: string | null;
  now: number;
  /** Pixels covered by top chrome / bottom sheets — keeps the camera's focus in the visible area. */
  topInset: number;
  bottomInset: number;
  picking: boolean;
  /**
   * While picking: where the published point will really land (e.g. a privacy grid cell)
   * and how big an area it stands for. Omit for an exact pin.
   */
  pickSnap?: (center: LatLng) => { center: LatLng; radiusMeters: number };
  userLocation: LatLng | null;
  onSelectSpot: (id: string | null) => void;
  onStatusChange?: (status: "loading" | "ready" | "error") => void;
}

type MarkerEntry = { el: HTMLDivElement; marker: Marker | null };

const LOAD_TIMEOUT_MS = 15_000;

/**
 * MAP LAYER. Knows about geography and rendering only — no data service imports.
 * Markers are real MapLibre Markers whose DOM element hosts a React portal,
 * so animations are coordinate-locked and the GPU does the positioning.
 */
export function FishingMap(props: FishingMapProps) {
  const {
    ref,
    styleUrl,
    initialCenter,
    initialZoom,
    spots,
    profiles,
    arrivals,
    selectedId,
    now,
    topInset,
    bottomInset,
    picking,
    pickSnap,
    userLocation,
    onSelectSpot,
    onStatusChange,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markers = useRef(new Map<string, MarkerEntry>());
  const userMarker = useRef<Marker | null>(null);
  const [height, setHeight] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [markersVersion, setMarkersVersion] = useState(0);
  const pickingRef = useRef(picking);
  pickingRef.current = picking;
  const insetsRef = useRef({ top: topInset, bottom: bottomInset });
  insetsRef.current = { top: topInset, bottom: bottomInset };

  /**
   * Screen point the UI treats as "the spot": centre of the area between the top chrome
   * and the bottom sheet. The pin is drawn here and the published location is read from
   * here, so they can never disagree — even while the camera padding is still animating.
   */
  const focusPoint = (map: MapLibreMap): [number, number] => {
    const el = map.getContainer();
    const { top, bottom } = insetsRef.current;
    return [el.clientWidth / 2, top + Math.max(0, el.clientHeight - top - bottom) / 2];
  };
  const currentPadding = () => ({ top: insetsRef.current.top, bottom: insetsRef.current.bottom, left: 0, right: 0 });
  const onSelectRef = useRef(onSelectSpot);
  onSelectRef.current = onSelectSpot;
  const onStatusRef = useRef(onStatusChange);
  onStatusRef.current = onStatusChange;

  const updateStatus = useCallback((s: "loading" | "ready" | "error") => {
    setStatus(s);
    onStatusRef.current?.(s);
  }, []);

  // ── create the map once (per retry) ─────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    updateStatus("loading");
    const map = new MapLibreMap({
      container,
      style: styleUrl,
      center: [initialCenter.lng, initialCenter.lat],
      zoom: initialZoom,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      maxPitch: 0,
      fadeDuration: 150,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new AttributionControl({ compact: true }), "bottom-right");
    mapRef.current = map;
    if (import.meta.env.DEV) (window as unknown as { __fpMap?: MapLibreMap }).__fpMap = map; // console debugging

    const timeout = setTimeout(() => !map.isStyleLoaded() && updateStatus("error"), LOAD_TIMEOUT_MS);
    map.on("style.load", () => {
      applyMarineTheme(map);
      clearTimeout(timeout);
      updateStatus("ready"); // interactive as soon as the style is in; tiles stream in after
      container.querySelector(".maplibregl-compact-show")?.classList.remove("maplibregl-compact-show");
    });
    map.on("error", (e) => {
      // Individual tile errors are normal on flaky networks; only a style failure is fatal.
      if (!map.isStyleLoaded() && !map.loaded()) console.warn("[FishPulse] map error", e.error?.message);
    });
    map.on("click", (e: MapMouseEvent) => {
      const target = e.originalEvent.target as HTMLElement | null;
      if (target?.closest(".fp-marker")) return; // marker clicks bubble to the map container
      if (pickingRef.current) {
        // Slide the tapped point under the pin.
        const [fx, fy] = focusPoint(map);
        map.panBy([e.point.x - fx, e.point.y - fy], { duration: 450 });
      }
      else onSelectRef.current(null);
    });

    // Re-attach markers that were created before (or survived) this map instance.
    for (const entry of markers.current.values()) entry.marker = null;
    setMarkersVersion((v) => v + 1);

    const ro = new ResizeObserver(() => {
      setHeight(container.clientHeight);
      map.resize();
    });
    ro.observe(container);
    setHeight(container.clientHeight);

    return () => {
      clearTimeout(timeout);
      ro.disconnect();
      for (const entry of markers.current.values()) {
        entry.marker?.remove();
        entry.marker = null;
      }
      userMarker.current?.remove();
      userMarker.current = null;
      map.remove();
      mapRef.current = null;
    };
    // initialCenter/zoom intentionally only used at creation time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleUrl, attempt, updateStatus]);

  // Lazily create one host element per spot (stable across renders).
  const hostFor = (id: string): HTMLDivElement => {
    let entry = markers.current.get(id);
    if (!entry) {
      const el = document.createElement("div");
      el.className = "fp-marker-host";
      entry = { el, marker: null };
      markers.current.set(id, entry);
    }
    return entry.el;
  };

  // ── sync MapLibre markers with the spot list ────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const ids = new Set(spots.map((s) => s.id));
    for (const s of spots) {
      const entry = markers.current.get(s.id);
      if (entry && !entry.marker) {
        entry.marker = new Marker({ element: entry.el, anchor: "center" }).setLngLat([s.longitude, s.latitude]).addTo(map);
      }
    }
    for (const [id, entry] of markers.current) {
      if (!ids.has(id)) {
        entry.marker?.remove();
        markers.current.delete(id);
      }
    }
  }, [spots, markersVersion]);

  // Selected marker on top.
  useEffect(() => {
    for (const [id, entry] of markers.current) entry.el.style.zIndex = id === selectedId ? "5" : arrivals[id] ? "4" : "";
  }, [selectedId, arrivals, spots]);

  // ── camera padding follows the UI chrome ────────────────────────────────
  const holdView = useRef(false);

  // Never interrupt an in-flight flyTo (e.g. "View Spot" opens a sheet mid-flight): chain after it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const padding = { top: topInset, bottom: bottomInset, left: 0, right: 0 };
    if (holdView.current) {
      // Keep the scene still: re-centre on whatever already sits at the new focus point.
      holdView.current = false;
      map.jumpTo({ padding, center: map.unproject(focusPoint(map)) });
      return;
    }
    const apply = () => void map.easeTo({ padding, duration: 450 });
    if (!map.isMoving()) {
      apply();
      return;
    }
    map.once("moveend", apply);
    return () => void map.off("moveend", apply);
  }, [topInset, bottomInset, status]);

  // ── "you are here" dot (local only, never published) ────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;
    if (!userMarker.current) {
      const el = document.createElement("div");
      el.className = "fp-user-dot";
      el.setAttribute("aria-label", "Your location (not shared)");
      userMarker.current = new Marker({ element: el }).setLngLat([userLocation.lng, userLocation.lat]).addTo(map);
    } else {
      userMarker.current.setLngLat([userLocation.lng, userLocation.lat]);
    }
  }, [userLocation, status]);

  useImperativeHandle(
    ref,
    () => ({
      flyTo(target, opts) {
        const map = mapRef.current;
        if (!map) return;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const zoom = opts?.exactZoom ? (opts.zoom ?? map.getZoom()) : Math.max(map.getZoom(), opts?.zoom ?? 13);
        // Passing the current padding makes the target land exactly on the focus point / pin.
        const padding = currentPadding();
        if (reduce) map.jumpTo({ center: [target.lng, target.lat], zoom, padding });
        else map.flyTo({ center: [target.lng, target.lat], zoom, padding, speed: 1.4, curve: 1.5, essential: true });
      },
      getPinLocation() {
        const map = mapRef.current;
        if (!map) return null;
        const c = map.unproject(focusPoint(map));
        return { lat: c.lat, lng: c.lng };
      },
      holdViewOnNextInsetChange() {
        holdView.current = true;
        setTimeout(() => (holdView.current = false), 1000); // only applies to the imminent change
      },
    }),
    [],
  );

  // Live preview of the snapped area, so what the picker shows is exactly what gets published.
  const [snapView, setSnapView] = useState<{ dx: number; dy: number; r: number } | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !picking || !pickSnap) {
      setSnapView(null);
      return;
    }
    const update = () => {
      const [fx, fy] = focusPoint(map);
      const c = map.unproject([fx, fy]);
      const snap = pickSnap({ lat: c.lat, lng: c.lng });
      const pc = { x: fx, y: fy };
      const ps = map.project([snap.center.lng, snap.center.lat]);
      const edge = map.project([snap.center.lng, snap.center.lat + snap.radiusMeters / 111_320]);
      setSnapView({ dx: ps.x - pc.x, dy: ps.y - pc.y, r: Math.abs(ps.y - edge.y) });
    };
    update();
    map.on("move", update);
    return () => void map.off("move", update);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picking, pickSnap, status, topInset, bottomInset, height]);

  const pickerTop = topInset + Math.max(0, height - topInset - bottomInset) / 2;

  return (
    <div className="absolute inset-0">
      {/* maplibre.css forces position:relative on the container, so size it via a wrapper */}
      <div className="absolute inset-0">
        <div ref={containerRef} className="h-full w-full" role="region" aria-label="Fishing activity map" />
      </div>
      <div className="fp-vignette pointer-events-none absolute inset-0" aria-hidden="true" />

      {spots.map((spot, i) =>
        createPortal(
          <HotspotMarker
            spot={spot}
            index={i}
            arrival={arrivals[spot.id]}
            selected={spot.id === selectedId}
            freshness={spotFreshness(spot, now)}
            onSelect={onSelectSpot}
            reporter={spot.creatorId ? profiles?.[spot.creatorId] : undefined}
          />,
          hostFor(spot.id),
          spot.id,
        ),
      )}

      <AnimatePresence>{picking && <LocationPicker key="picker" top={pickerTop} snap={snapView} />}</AnimatePresence>

      {status === "loading" && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="fp-loader" role="status" aria-label="Loading map" />
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 grid place-items-center bg-cream/80 p-6">
          <div className="glass max-w-xs rounded-3xl p-5 text-center">
            <p className="text-3xl">🗺️</p>
            <p className="mt-1 font-extrabold text-ink">The map couldn't load</p>
            <p className="mt-1 text-sm text-ink-soft">Check your connection — reports will appear as soon as tiles load.</p>
            <button className="btn-secondary mt-4" onClick={() => setAttempt((a) => a + 1)}>
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
