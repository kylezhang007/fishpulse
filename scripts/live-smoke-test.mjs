// Live Mode smoke test: two independent anonymous "devices" against the real Supabase project.
//   node scripts/live-smoke-test.mjs
// Reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from .env. Test spots are placed at 0,0
// (open ocean, far from any demo map) with the minimum 5-minute lifetime.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => /^\s*(VITE_|SMOKE_)/.test(l))
    .map((l) => l.split("=").map((s) => s.trim()))
    .map(([k, ...v]) => [k, v.join("=")]),
);
const URL_ = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_ANON_KEY;
if (!URL_ || !KEY) throw new Error("Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env");
// Test-only invite code (local .env only) so test runs never use up the real <MEMBER_INVITE_CODE> seats.
const SMOKE_CODE = env.SMOKE_INVITE_CODE;
if (!SMOKE_CODE) throw new Error("Set SMOKE_INVITE_CODE in .env (see README → Live smoke test)");

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
};
const spot = (over = {}) => ({
  id: randomUUID(),
  latitude: 0,
  longitude: 0,
  username: "smoke-test",
  fish_type: "Bass",
  activity_level: "high",
  note: "automated test",
  is_approximate: true,
  expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
  ...over,
});

// Device A: viewer, subscribed to realtime
const A = createClient(URL_, KEY, opts);
const { error: aErr } = await A.auth.signInAnonymously();
check("Device A anonymous sign-in", !aErr, aErr?.message);

const received = [];
const subscribed = new Promise((resolve, reject) => {
  A.channel("smoke")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "fishing_spots" }, (p) => received.push(p.new))
    .subscribe((status, err) => {
      if (status === "SUBSCRIBED") resolve();
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") reject(err ?? new Error(status));
    });
});
await subscribed.then(
  () => check("Device A realtime subscription", true),
  (e) => check("Device A realtime subscription", false, e.message),
);

// Device B: reporter — starts as a guest, which must NOT be able to post
const B = createClient(URL_, KEY, opts);
const { data: bAuth, error: bErr } = await B.auth.signInAnonymously();
check("Device B anonymous sign-in", !bErr, bErr?.message);
const { data: guest, error: gErr } = await B.rpc("register_guest", { p_color: "#9aa6bb" });
check("Guest profile is created (Guest-####)", !gErr && /^Guest-\d{4}$/.test(guest?.display_name ?? ""), gErr?.message ?? guest?.display_name);
const { error: guestPostErr } = await B.from("fishing_spots").insert(spot());
check("Guests cannot post hotspots", !!guestPostErr);
const { error: badCodeErr } = await B.rpc("register_member", { p_code: "WRONG-CODE", p_name: "zz-nope", p_color: "#3fb2ff" });
check("Wrong invite code is rejected", /invalid_code/.test(badCodeErr?.message ?? ""));
const { error: takenErr } = await B.rpc("register_member", { p_code: SMOKE_CODE, p_name: guest?.display_name ?? "Guest-0000", p_color: "#3fb2ff" });
check("Guest-style names are reserved", /name_invalid|name_taken/.test(takenErr?.message ?? ""));
const memberName = `zz-smoke-${randomUUID().slice(0, 6)}`;
const { data: member, error: mErr } = await B.rpc("register_member", { p_code: SMOKE_CODE, p_name: memberName, p_color: "#3fb2ff" });
check("Guest upgrades to member with an invite code (same account)", !mErr && member?.role === "member" && member?.id === bAuth.user.id, mErr?.message);
const { data: codes } = await A.from("invite_codes").select("code");
check("Invite codes are not readable by clients", !codes || codes.length === 0);

const row = spot({ creator_id: randomUUID() }); // try to forge ownership
const t0 = Date.now();
const { data: inserted, error: insErr } = await B.from("fishing_spots").insert(row).select("id,creator_id,expires_at,created_at").single();
check("Device B publishes a report", !insErr, insErr?.message);
if (inserted) {
  check("creator_id is forced to the real user (can't be forged)", inserted.creator_id === bAuth.user.id);
}

// Wait up to 10 s for A to receive it
for (let i = 0; i < 100 && !received.some((r) => r.id === row.id); i++) await new Promise((r) => setTimeout(r, 100));
const got = received.find((r) => r.id === row.id);
check("Device A receives B's report in realtime", !!got, got ? `${Date.now() - t0} ms` : "not received within 10 s");

// Initial-load path: A can read it
const { data: readBack } = await A.from("fishing_spots").select("id").eq("id", row.id);
check("Device A can load active reports", readBack?.length === 1);

// Security: B cannot modify or delete it
const { data: upd } = await B.from("fishing_spots").update({ fish_type: "Hacked" }).eq("id", row.id).select();
check("Reports can't be edited from the client", !upd || upd.length === 0);
const { data: del } = await B.from("fishing_spots").delete().eq("id", row.id).select();
check("Reports can't be deleted from the client", !del || del.length === 0);

// Security: a client without a session cannot publish
const anon = createClient(URL_, KEY, opts);
const { error: noAuthErr } = await anon.from("fishing_spots").insert(spot());
check("Publishing without a guest session is rejected", !!noAuthErr);

// Validation at the database boundary
const { error: badLevel } = await B.from("fishing_spots").insert(spot({ activity_level: "insane" }));
check("Invalid activity level is rejected by the database", !!badLevel);

// Lifetime is clamped server-side (asks for 1 min, gets the 5-min minimum — keeps test rows short-lived)
const { data: shortRow } = await B.from("fishing_spots")
  .insert(spot({ expires_at: new Date(Date.now() + 60_000).toISOString() }))
  .select("created_at,expires_at")
  .single();
const mins = shortRow ? (Date.parse(shortRow.expires_at) - Date.parse(shortRow.created_at)) / 60_000 : NaN;
check("Report lifetime is clamped server-side", mins >= 4.99 && mins <= 5.01, `${mins.toFixed(2)} min`);

// Admin features (never actually clears data here)
const { error: clearErr } = await B.rpc("admin_clear_spots");
check("Non-admins cannot clear the map", /not_admin/.test(clearErr?.message ?? ""));
const { data: kzFree } = await B.rpc("is_name_available", { p_name: "KyleZhang" });
check('The name "kylezhang" is reserved for the admin', kzFree === false);

// Community (Ocean) — permissions only; never posts real content
const { error: feedErr } = await createClient(URL_, KEY, opts).from("posts").select("id").limit(1);
check("Anyone can read the community feed", !feedErr, feedErr?.message);
const { data: someCatch } = await A.from("catches").select("id,user_id").neq("user_id", bAuth.user.id).limit(1).maybeSingle();
if (someCatch) {
  const { error: stealErr } = await B.from("posts").insert({ catch_id: someCatch.id, caption: "not mine" });
  check("Members can't share someone else's catch card", !!stealErr, stealErr?.code);
}
const G = createClient(URL_, KEY, opts);
await G.auth.signInAnonymously();
await G.rpc("register_guest", { p_color: "#9aa6bb" });
const { data: anyPost } = await G.from("posts").select("id").limit(1).maybeSingle();
if (anyPost) {
  const { error: guestLikeErr } = await G.from("post_likes").insert({ post_id: anyPost.id });
  check("Guests can't like posts", !!guestLikeErr, guestLikeErr?.code);
}

// "Everyone refresh" broadcast reaches other clients
let refreshed = false;
const ctlA = A.channel("fishpulse-control", { config: { broadcast: { self: true } } });
await new Promise((res) => ctlA.on("broadcast", { event: "refresh" }, () => (refreshed = true)).subscribe((st) => st === "SUBSCRIBED" && res()));
const ctlB = B.channel("fishpulse-control");
await new Promise((res) => ctlB.subscribe((st) => st === "SUBSCRIBED" && res()));
await ctlB.send({ type: "broadcast", event: "refresh", payload: { reason: "smoke-test" } });
for (let i = 0; i < 50 && !refreshed; i++) await new Promise((r) => setTimeout(r, 100));
check('"Refresh everyone" broadcast reaches other devices', refreshed);
await B.removeAllChannels();

// Friends + chat: guests can't befriend, strangers can't message, friends can (live)
const C = createClient(URL_, KEY, opts);
const { data: cAuth } = await C.auth.signInAnonymously();
await C.realtime.setAuth();
const { error: cErr } = await C.rpc("register_member", { p_code: SMOKE_CODE, p_name: `zz-smoke-${randomUUID().slice(0, 6)}`, p_color: "#ff8a65" });
check("Second member joins for the chat test", !cErr, cErr?.message);
const bId = bAuth.user.id;
const cId = cAuth.user.id;
const { error: guestFrErr } = await G.from("friendships").insert({ addressee_id: bId });
check("Guests can't send friend requests", !!guestFrErr, guestFrErr?.code);
const { error: strangerMsgErr } = await B.from("messages").insert({ recipient_id: cId, body: "hi stranger" });
check("Non-friends can't message each other", !!strangerMsgErr, strangerMsgErr?.code);
const { data: fr, error: frErr } = await B.from("friendships").insert({ addressee_id: cId }).select("id").single();
check("Member sends a friend request", !frErr, frErr?.message);
const { data: selfAccept } = await B.from("friendships").update({ status: "accepted" }).eq("id", fr?.id).select();
check("Requester can't accept their own request", !selfAccept || selfAccept.length === 0);
const { data: accepted, error: accErr } = await C.from("friendships").update({ status: "accepted", responded_at: new Date().toISOString() }).eq("id", fr?.id).select();
check("Addressee accepts the request", !accErr && accepted?.length === 1, accErr?.message);
const inbox = [];
await new Promise((res) =>
  C.channel("smoke-dm")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p) => inbox.push(p.new))
    .subscribe((st) => st === "SUBSCRIBED" && res()),
);
const body = `smoke ${randomUUID().slice(0, 6)}`;
const { error: dmErr } = await B.from("messages").insert({ recipient_id: cId, body });
check("Friends can message each other", !dmErr, dmErr?.message);
for (let i = 0; i < 50 && !inbox.some((m) => m.body === body); i++) await new Promise((r) => setTimeout(r, 100));
check("The friend receives the message in realtime", inbox.some((m) => m.body === body));
const { data: peek } = await A.from("messages").select("id").eq("recipient_id", cId);
check("Other users can't read the conversation", !peek || peek.length === 0);
await B.from("friendships").delete().eq("id", fr?.id);
await C.removeAllChannels();

await A.removeAllChannels();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
