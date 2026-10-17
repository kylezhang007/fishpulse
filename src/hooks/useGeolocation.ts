import { useCallback, useState } from "react";
import type { LatLng } from "../types/fishing";

export type GeoState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "ok"; position: LatLng; accuracy: number }
  | { status: "error"; message: string };

/**
 * One-shot, user-initiated geolocation. Never watches or tracks in the background,
 * and the position is never sent anywhere unless the user publishes a report there.
 */
export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ status: "idle" });

  const locate = useCallback((): Promise<LatLng | null> => {
    if (!("geolocation" in navigator)) {
      setState({ status: "error", message: "Location isn't available in this browser." });
      return Promise.resolve(null);
    }
    if (!window.isSecureContext) {
      setState({ status: "error", message: "Location needs HTTPS. Move the map manually instead." });
      return Promise.resolve(null);
    }
    setState({ status: "locating" });
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const position = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setState({ status: "ok", position, accuracy: pos.coords.accuracy });
          resolve(position);
        },
        (err) => {
          setState({
            status: "error",
            message:
              err.code === err.PERMISSION_DENIED
                ? "Location permission denied — you can still pan the map."
                : "Couldn't get your location. Pan the map instead.",
          });
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
      );
    });
  }, []);

  return { state, locate };
}
