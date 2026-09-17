import { defineConfig, mergeConfig } from "vitest/config";
import { preview } from "@vitest/browser-preview";
import viteConfig from "./vite.config";

// Tests run in a real browser tab, not in jsdom. The `preview` provider needs
// no Playwright or Chromium download, which is what lets it run on StackBlitz:
// `npm test` starts a server, and the tests run in whatever browser opens it.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: ["exercises/**/*.test.tsx"],
      setupFiles: ["./vitest.setup.ts"],
      browser: {
        enabled: true,
        provider: preview(),
        instances: [{ browser: "chromium" }],
      },
    },
  }),
);
