/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_MODE?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_MAP_STYLE_URL?: string;
  readonly VITE_DEFAULT_CENTER?: string;
  readonly VITE_DEFAULT_ZOOM?: string;
  readonly VITE_REPORT_TTL_MINUTES?: string;
  readonly VITE_SUBMIT_COOLDOWN_SECONDS?: string;
  readonly VITE_ENABLE_SIMULATOR?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
