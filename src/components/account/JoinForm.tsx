import { motion } from "motion/react";
import { useEffect, useState, type FormEvent } from "react";
import { colorForName, NAME_MAX, validateDisplayName } from "../../domain/profile";
import { Avatar } from "../ui/Avatar";

/** Invite code + unique name. Used on the welcome screen and for guest upgrades. */
export function JoinForm({
  onJoin,
  checkName,
  submitLabel = "Join as member",
}: {
  onJoin: (code: string, name: string) => Promise<unknown>;
  checkName: (name: string) => Promise<boolean>;
  submitLabel?: string;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [nameState, setNameState] = useState<"idle" | "checking" | "ok" | "taken">("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameError = name ? validateDisplayName(name) : null;

  // Live "is this name free?" check (debounced).
  useEffect(() => {
    if (!name || nameError) {
      setNameState("idle");
      return;
    }
    setNameState("checking");
    const t = setTimeout(() => {
      checkName(name.trim())
        .then((ok) => setNameState(ok ? "ok" : "taken"))
        .catch(() => setNameState("idle"));
    }, 400);
    return () => clearTimeout(t);
  }, [name, nameError, checkName]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim() || (name && (nameError || nameState === "taken")) || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onJoin(code.trim().toUpperCase(), name.trim().replace(/\s+/g, " "));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  };

  const hint =
    nameError ??
    (nameState === "checking"
      ? "Checking…"
      : nameState === "taken"
        ? "That name is taken — try another."
        : nameState === "ok"
          ? "Nice, it's yours!"
          : "2–20 characters, must be unique");
  const hintColor = nameState === "taken" || nameError ? "#d6455d" : nameState === "ok" ? "#139a6c" : "#9aa6bb";

  return (
    <form onSubmit={submit} className="space-y-3 text-left" noValidate>
      <label className="block">
        <span className="field-label">Invite code</span>
        <input
          className="input tracking-widest uppercase"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ENTER CODE"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <label className="block">
        <span className="field-label">Your angler name</span>
        <div className="flex items-center gap-2">
          <Avatar
            profile={name ? { id: "", displayName: name, role: "member", avatarColor: colorForName(name), createdAt: "" } : null}
            name="?"
            size={44}
          />
          <input
            className="input"
            value={name}
            maxLength={NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex"
            autoComplete="nickname"
          />
        </div>
        <span className="mt-1 block text-[11px] font-bold" style={{ color: hintColor }}>
          {hint}
        </span>
      </label>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0, x: [0, -6, 6, -3, 0] }}
          className="rounded-2xl bg-coral-soft px-3 py-2 text-xs font-bold text-[#d6455d]"
          role="alert"
        >
          😵 {error}
        </motion.p>
      )}
      <motion.button
        type="submit"
        className="btn-primary w-full shrink-0"
        whileTap={{ scale: 0.96 }}
        disabled={busy || !code.trim() || (!!name && (!!nameError || nameState === "taken" || nameState === "checking"))}
        aria-busy={busy}
      >
        {busy ? "Joining…" : submitLabel}
      </motion.button>
    </form>
  );
}
