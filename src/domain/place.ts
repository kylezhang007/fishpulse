import type { LatLng } from "../types/fishing";

/**
 * One-shot location → human place name ("Lake Tahoe, California") via OpenStreetMap Nominatim.
 * Only the name is stored on the card — never coordinates. Returns undefined on any failure.
 */
export async function lookupPlaceName(p: LatLng): Promise<string | undefined> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=12&accept-language=en&lat=${p.lat.toFixed(3)}&lon=${p.lng.toFixed(3)}`;
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) return undefined;
    const j = await r.json();
    const a = j.address ?? {};
    const local = j.name || a.water || a.city || a.town || a.village || a.hamlet || a.county;
    const region = a.state || a.country;
    const text = [local, region].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).join(", ");
    return text ? text.slice(0, 120) : undefined;
  } catch {
    return undefined;
  }
}

/** Ask for the current position once (permission prompt); resolves undefined if refused. */
export function currentPosition(timeoutMs = 8000): Promise<LatLng | undefined> {
  if (!("geolocation" in navigator) || !window.isSecureContext) return Promise.resolve(undefined);
  return new Promise((resolve) =>
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(undefined),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 300_000 },
    ),
  );
}
