import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Lazily create the browser client (anon/publishable key only). */
export function getSupabase(url: string, anonKey: string): SupabaseClient {
  if (!client) {
    client = createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: "fishpulse-auth" },
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }
  return client;
}
