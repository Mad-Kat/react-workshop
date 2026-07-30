/**
 * The "server" of the fake-SSR simulator.
 *
 * A Web Worker is a JavaScript realm with no `window`, no `localStorage`, and
 * no DOM — exactly like Node on a real server. Running `renderToString` here
 * means server-only crashes (`window is not defined`) throw for real instead
 * of silently succeeding the way they would on the main thread.
 */
import type { ComponentType } from "react";
import { createElement } from "react";
// Explicit .browser build: no Node streams, works inside a worker.
import { renderToString } from "react-dom/server.browser";
import { exerciseModules } from "./registry";

// In dev, Vite's react-refresh transform wraps the exercise modules with
// bare $RefreshReg$/$RefreshSig$ calls at module scope. They're no-ops on a
// "server", but must exist as globals or the import itself throws.
(self as unknown as Record<string, unknown>).$RefreshReg$ = () => {};
(self as unknown as Record<string, unknown>).$RefreshSig$ =
  () => (type: unknown) => type;

export interface RenderRequest {
  runId: number;
  moduleKey: string;
  exportName: string;
}

export type RenderResponse =
  | { runId: number; ok: true; html: string; durationMs: number }
  | {
      runId: number;
      ok: false;
      error: { name: string; message: string; stack: string };
    };

self.onmessage = async (event: MessageEvent<RenderRequest>) => {
  const { runId, moduleKey, exportName } = event.data;
  try {
    const loader = exerciseModules[moduleKey];
    if (!loader) {
      throw new Error(`Unknown exercise module: ${moduleKey}`);
    }
    const mod = (await loader()) as Record<string, unknown>;
    const Component = mod[exportName];
    if (typeof Component !== "function") {
      throw new Error(`Export "${exportName}" not found in ${moduleKey}`);
    }
    const start = performance.now();
    const html = renderToString(createElement(Component as ComponentType));
    const response: RenderResponse = {
      runId,
      ok: true,
      html,
      durationMs: Math.round(performance.now() - start),
    };
    self.postMessage(response);
  } catch (err) {
    // Error objects don't structured-clone reliably — send plain data.
    const error = err instanceof Error ? err : new Error(String(err));
    const response: RenderResponse = {
      runId,
      ok: false,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack ?? "",
      },
    };
    self.postMessage(response);
  }
};
