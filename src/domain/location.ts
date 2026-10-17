import type { LatLng } from "../types/fishing";

const METERS_PER_DEG_LAT = 111_320;

/** Default privacy grid. ~300 m hides the exact casting spot but keeps the lake area useful. */
export const APPROXIMATE_GRID_METERS = 300;

/**
 * Snap a coordinate to the centre of a fixed grid cell. Deterministic snapping
 * (rather than random jitter) means repeated reports from the same place can't be
 * averaged back to the precise location.
 */
export function approximateLocation(point: LatLng, gridMeters = APPROXIMATE_GRID_METERS): LatLng {
  const latStep = gridMeters / METERS_PER_DEG_LAT;
  const lat = (Math.floor(point.lat / latStep) + 0.5) * latStep;
  const cosLat = Math.max(0.01, Math.cos((lat * Math.PI) / 180));
  const lngStep = gridMeters / (METERS_PER_DEG_LAT * cosLat);
  const lng = (Math.floor(point.lng / lngStep) + 0.5) * lngStep;
  return { lat: round6(clamp(lat, -90, 90)), lng: round6(clamp(lng, -180, 180)) };
}

export function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/** Great-circle distance in metres. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  return `${(m / 1000).toFixed(m < 10_000 ? 1 : 0)} km`;
}

function round6(n: number) {
  return Math.round(n * 1e6) / 1e6;
}
function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
