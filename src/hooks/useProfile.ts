import { useCallback, useEffect, useRef, useState } from "react";
import { colorForName } from "../domain/profile";
import type { ProfileService } from "../services";
import type { Profile } from "../types/fishing";

export type ProfileState = "loading" | "onboarding" | "ready" | "error";

/** The current device's account: loads it, or asks the user to join / continue as guest. */
export function useMyProfile(service: ProfileService) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [state, setState] = useState<ProfileState>("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const me = await service.getMyProfile();
      setProfile(me);
      setState(me ? "ready" : "onboarding");
    } catch {
      setState("error");
    }
  }, [service]);

  useEffect(() => {
    void load();
  }, [load]);

  const continueAsGuest = useCallback(async () => {
    const me = await service.registerGuest("#9aa6bb");
    setProfile(me);
    setState("ready");
    return me;
  }, [service]);

  const join = useCallback(
    async (code: string, name: string) => {
      const me = await service.registerMember(code, name, colorForName(name));
      setProfile(me);
      setState("ready");
      return me;
    },
    [service],
  );

  const isMember = profile?.role === "member" || profile?.role === "admin";
  return { profile, state, isMember, isAdmin: profile?.role === "admin", continueAsGuest, join, retry: load };
}

/** Cache of other people's public profiles, fetched in batches as ids appear. */
export function useProfiles(service: ProfileService, ids: (string | undefined)[], extra?: Profile | null) {
  const [byId, setById] = useState<Record<string, Profile>>({});
  const requested = useRef(new Set<string>());
  const key = [...new Set(ids.filter(Boolean) as string[])].sort().join(",");

  useEffect(() => {
    const missing = key.split(",").filter((id) => id && !requested.current.has(id));
    if (missing.length === 0) return;
    missing.forEach((id) => requested.current.add(id));
    service
      .getProfiles(missing)
      .then((list) => setById((prev) => ({ ...prev, ...Object.fromEntries(list.map((p) => [p.id, p])) })))
      .catch(() => missing.forEach((id) => requested.current.delete(id))); // retry next time
  }, [key, service]);

  return extra ? { ...byId, [extra.id]: extra } : byId;
}
