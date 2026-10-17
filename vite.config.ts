import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // MapLibre alone is ~800 KB; see docs/ROADMAP.md for the code-splitting plan.
  build: { chunkSizeWarningLimit: 1800 },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
