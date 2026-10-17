// FishPulse — `identify-fish` Supabase Edge Function (Deno).
// POST raw image bytes (Content-Type: image/jpeg|png|webp) with the user's JWT.
// Optional header: x-place (URI-encoded place name for the card).
//
// Secrets (Dashboard → Edge Functions → Secrets): FISHIAL_CLIENT_ID, FISHIAL_CLIENT_SECRET.
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are provided automatically.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-place",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const FISHIAL = "https://api-recognition.fishial.ai/v2";
const MAX_BYTES = 6 * 1024 * 1024;

// Scientific name → one of our 4 cartoon icons (by genus / species).
const ICONS: [RegExp, string][] = [
  [/^Oncorhynchus (mykiss|clarkii|aguabonita|gilae)\b/i, "Trout"],
  [/^(Salmo trutta|Salvelinus|Thymallus)\b/i, "Trout"],
  [/^(Oncorhynchus|Salmo salar|Hucho)\b/i, "Salmon"],
  [/^(Micropterus|Morone|Dicentrarchus|Lateolabrax|Ambloplites)\b/i, "Bass"],
  [/^(Ictalurus|Ameiurus|Pylodictis|Silurus|Clarias|Pangasius|Arius|Bagre)\b/i, "Catfish"],
];

let cachedToken: { value: string; exp: number } | null = null;

async function fishialToken(clientId: string, clientSecret: string): Promise<string> {
  if (cachedToken && cachedToken.exp > Date.now()) return cachedToken.value;
  const r = await fetch(`${FISHIAL}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
  });
  if (!r.ok) throw new Error(`fishial_auth_${r.status}`);
  const j = await r.json();
  cachedToken = { value: j.access_token, exp: Date.now() + 540_000 }; // TTL 600 s, refresh at 9 min
  return cachedToken.value;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  try {
    // 1) Who is calling? Members and admins only.
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: auth } = await db.auth.getUser(jwt);
    const user = auth?.user;
    if (!user) return json({ error: "not_signed_in" }, 401);
    const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (!profile || (profile.role !== "member" && profile.role !== "admin")) return json({ error: "members_only" }, 403);
    const isAdmin = profile.role === "admin";

    // 2) Monthly quota (admins are exempt).
    if (!isAdmin) {
      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);
      const since = monthStart.toISOString();
      const { data: settings } = await db.from("app_settings").select("key,value");
      const get = (k: string, d: number) => settings?.find((s) => s.key === k)?.value ?? d;
      const { count: mine } = await db
        .from("fish_id_requests")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .neq("outcome", "error")
        .gte("created_at", since);
      if ((mine ?? 0) >= get("fishid_member_monthly", 5)) return json({ error: "quota_user" }, 429);
      const { count: all } = await db
        .from("fish_id_requests")
        .select("id", { count: "exact", head: true })
        .neq("outcome", "error")
        .gte("created_at", since);
      if ((all ?? 0) >= get("fishid_global_monthly", 180)) return json({ error: "quota_global" }, 429);
    }

    // 3) Image.
    const clientId = Deno.env.get("FISHIAL_CLIENT_ID");
    const clientSecret = Deno.env.get("FISHIAL_CLIENT_SECRET");
    if (!clientId || !clientSecret) return json({ error: "not_configured" }, 503);
    const contentType = (req.headers.get("content-type") ?? "image/jpeg").split(";")[0];
    if (!/^image\/(jpeg|png|webp)$/.test(contentType)) return json({ error: "bad_image" }, 400);
    const bytes = new Uint8Array(await req.arrayBuffer());
    if (bytes.length < 1000 || bytes.length > MAX_BYTES) return json({ error: "bad_image" }, 400);
    const placeRaw = req.headers.get("x-place");
    const place = placeRaw ? decodeURIComponent(placeRaw).slice(0, 120) : null;

    // 4) Fishial recognition (one credit).
    const token = await fishialToken(clientId, clientSecret);
    const r = await fetch(`${FISHIAL}/recognize`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": contentType },
      body: bytes,
    });
    const body = await r.json().catch(() => null);
    if (!r.ok || !body?.ok) {
      await db.from("fish_id_requests").insert({ user_id: user.id, outcome: "error" });
      if (r.status === 401) cachedToken = null;
      const text = JSON.stringify(body ?? {});
      if (/credits_insufficient/.test(text)) return json({ error: "out_of_credits" }, 402);
      return json({ error: "fishial_error", status: r.status }, 502);
    }

    // 5) Best guess across all detected fish.
    let best: { id: string; certainty: number } | null = null;
    for (const obj of body.objects ?? []) {
      for (const sp of obj.species ?? []) if (!best || sp.certainty > best.certainty) best = sp;
    }
    await db.from("fish_id_requests").insert({ user_id: user.id, outcome: best ? "ok" : "no_fish" });
    if (!best) return json({ found: false });

    const def = body.definitions?.[best.id] ?? {};
    const scientific: string | null = def.scientificName ?? null;
    const common: string = def.commonName || scientific || "Unknown fish";
    const icon = scientific ? (ICONS.find(([re]) => re.test(scientific))?.[1] ?? null) : null;
    const wiki = `https://en.wikipedia.org/wiki/${encodeURIComponent((scientific ?? common).replace(/ /g, "_"))}`;

    // 6) Save the photo + card.
    const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const up = await db.storage.from("catch-photos").upload(path, bytes, { contentType, upsert: false });
    const { count: cards } = await db.from("catches").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    const { data: card, error: insErr } = await db
      .from("catches")
      .insert({
        user_id: user.id,
        card_no: (cards ?? 0) + 1,
        species_common: common,
        species_scientific: scientific,
        icon_species: icon,
        certainty: Math.max(0, Math.min(1, best.certainty)),
        photo_path: up.error ? null : path,
        place_name: place,
        wiki_url: wiki,
      })
      .select("*")
      .single();
    if (insErr) return json({ error: "save_failed", detail: insErr.message }, 500);
    return json({ found: true, card });
  } catch (e) {
    return json({ error: "server_error", detail: String(e) }, 500);
  }
});
