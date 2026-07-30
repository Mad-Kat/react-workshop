import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    {
      // The react-refresh runtime accesses `window` at module top level, which
      // crashes when an exercise module is imported inside the fake-SSR worker
      // (exercise 12). globalThis works in both realms.
      name: "worker-safe-react-refresh",
      transform(code, id) {
        if (!id.includes("react-refresh")) return;
        return code
          .replaceAll(
            "window.__registerBeforePerformReactRefresh",
            "globalThis.__registerBeforePerformReactRefresh",
          )
          .replaceAll(
            "window.__getReactRefreshIgnoredExports",
            "globalThis.__getReactRefreshIgnoredExports",
          );
      },
    },
  ],
  worker: {
    // The SSR worker code-splits (import.meta.glob over the exercises), which
    // the default iife worker format doesn't support.
    format: "es",
  },
  optimizeDeps: {
    // Pre-bundle the SSR entry used by the fake-SSR worker (exercise 12) so
    // its first run doesn't trigger a mid-session "new dependencies
    // optimized" page reload during the workshop.
    include: ["react-dom/server.browser"],
  },
});
