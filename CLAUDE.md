# CLAUDE.md

**Read `AGENTS.md` first.** It holds the project rules, live setup, and known traps, and it applies to every AI assistant, Claude included.

The non-negotiables, in short:

- Update `README_AI.md` (the full manual, including a dated Changelog line) in the same change as any feature, config, deploy, or URL change. `README.md` is the short, judge-facing English page: refresh it only when a headline feature or link changes.
- Never commit secrets or access codes. Use the placeholders `<MEMBER_INVITE_CODE>` / `<ADMIN_CODE>`; real values live in the git-ignored `CODES.local.md`.
- Fishial credits cost money (200 per month). Test Fish ID in Demo Mode and ask before making real calls.
- Ask before publishing (Vercel), pushing (GitHub), or running SQL on the live Supabase project.
- Reply to the owner in Chinese; keep the app UI in English.
- Node lives at `~/.local/node/bin`: `export PATH=$HOME/.local/node/bin:$PATH`.
