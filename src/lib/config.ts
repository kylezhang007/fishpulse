/**
 * Typed runtime configuration, read once from Vite env vars.
 * Everything here ships to the browser — never put secrets in VITE_ variables.
 */
import type { LatLng } from "../types/fishing";

export type DataMode = "demo" | "live";

export interface AppConfig {
  dataMode: DataMode;
  /** Set when live was requested but credentials are missing and we fell back to demo. */
  configWarning?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  mapStyleUrl: string;
  defaultCenter: LatLng;
  defaultZoom: number;
  reportTtlMinutes: number;
  submitCooldownSeconds: number;
  enableSimulator: boolean;
}

const env = import.meta.env;

function num(value: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number(value);
  return Number.isFinite(n) && value !== "" && value !== undefined ? Math.min(max, Math.max(min, n)) : fallback;
}

function parseCenter(value: string | undefined): LatLng {
  const [lat, lng] = (value ?? "").split(",").map((v) => Number(v.trim()));
  if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
  return { lat: 39.09, lng: -120.04 }; // Lake Tahoe
}

function resolveMode(): Pick<AppConfig, "dataMode" | "configWarning"> {
  const hasSupabase = Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY);
  const requested = (env.VITE_DATA_MODE ?? "").toLowerCase();
  if (requested === "demo") return { dataMode: "demo" };
  if (requested === "live" && !hasSupabase)
    return {
      dataMode: "demo",
      configWarning: "Live Mode requested but VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing — running Demo Mode.",
    };
  return { dataMode: hasSupabase ? "live" : "demo" };
}

export const config: AppConfig = {
  ...resolveMode(),
  supabaseUrl: env.VITE_SUPABASE_URL || undefined,
  supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY || undefined,
  mapStyleUrl: env.VITE_MAP_STYLE_URL || "https://tiles.openfreemap.org/styles/positron",
  defaultCenter: parseCenter(env.VITE_DEFAULT_CENTER),
  defaultZoom: num(env.VITE_DEFAULT_ZOOM, 10, 2, 18),
  reportTtlMinutes: num(env.VITE_REPORT_TTL_MINUTES, 30, 5, 360),
  submitCooldownSeconds: num(env.VITE_SUBMIT_COOLDOWN_SECONDS, 20, 0, 600),
  enableSimulator: (env.VITE_ENABLE_SIMULATOR ?? "true") !== "false",
};
