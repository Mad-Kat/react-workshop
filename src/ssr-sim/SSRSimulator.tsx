/**
 * Fake-SSR simulator harness.
 *
 * Pane 1 — "Server render": the component is rendered to HTML inside a Web
 *   Worker (no window, no localStorage — like Node). Server-only bugs crash
 *   here with the same ReferenceError a real server would throw.
 * Pane 2 — "Client hydration": the worker's HTML is injected into the page
 *   and hydrated with hydrateRoot, producing a live, interactive app.
 * Pane 3 — "Hydration console": console.error/warn output captured during
 *   hydration, where React 19 reports hydration mismatches.
 *
 * Re-runs automatically when you save a file (Vite HMR), or via the button.
 */
import type { ComponentType, FunctionComponent } from "react";
import { createElement, useEffect, useRef, useState } from "react";
import type { Root } from "react-dom/client";
import { hydrateRoot } from "react-dom/client";
import type { RenderRequest, RenderResponse } from "./ssrWorker";
import { exerciseModules, resolveModuleKey } from "./registry";

const WORKER_TIMEOUT_MS = 5000;
const CONSOLE_CAPTURE_MS = 400;

type Phase =
  | { name: "server-rendering" }
  | {
      name: "server-crashed";
      error: { name: string; message: string; stack: string };
    }
  | { name: "hydrating"; html: string; durationMs: number }
  | { name: "done"; html: string; durationMs: number };

/** printf-lite: substitute %s/%d/%i/%f/%o/%O/%c like the console does. */
const formatConsoleArgs = (args: unknown[]): string => {
  const [first, ...rest] = args;
  if (typeof first !== "string") {
    return args.map(String).join(" ");
  }
  let i = 0;
  const formatted = first.replace(/%[sdifoOc%]/g, (match) => {
    if (match === "%%") return "%";
    if (match === "%c") {
      i += 1; // consume the style arg, emit nothing
      return "";
    }
    const value = rest[i];
    i += 1;
    return String(value);
  });
  const leftover = rest.slice(i).map(String).join(" ");
  return leftover ? `${formatted} ${leftover}` : formatted;
};

const paneStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  borderRadius: 8,
  padding: 16,
  marginBottom: 16,
};

const PaneTitle: FunctionComponent<{ children: React.ReactNode }> = ({
  children,
}) => <h3 style={{ marginTop: 0 }}>{children}</h3>;

const StatusBadge: FunctionComponent<{
  kind: "ok" | "error" | "pending" | "skipped";
  children: React.ReactNode;
}> = ({ kind, children }) => {
  const colors = {
    ok: { background: "#e6f4ea", color: "#137333" },
    error: { background: "#fce8e6", color: "#c5221f" },
    pending: { background: "#fef7e0", color: "#b06000" },
    skipped: { background: "#f1f3f4", color: "#5f6368" },
  } as const;
  return (
    <span
      style={{
        ...colors[kind],
        borderRadius: 4,
        padding: "2px 8px",
        fontWeight: 600,
        fontSize: 13,
      }}
    >
      {children}
    </span>
  );
};

export const SSRSimulator: FunctionComponent<{
  /** Short module key, e.g. "12-ssr-hydration/exercise" */
  moduleKey: string;
  /** Named export to render, e.g. "SSRExercises" */
  exportName: string;
  title?: string;
}> = ({ moduleKey, exportName, title }) => {
  const [runToken, setRunToken] = useState(0);
  const [phase, setPhase] = useState<Phase>({ name: "server-rendering" });
  const [consoleMessages, setConsoleMessages] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<Root | null>(null);

  // Auto re-run whenever Vite applies a hot update (e.g. the student saves
  // the exercise file). react-refresh preserves component state, so without
  // this listener a save would NOT re-run the simulation.
  useEffect(() => {
    if (!import.meta.hot) return;
    const rerun = () => setRunToken((t) => t + 1);
    import.meta.hot.on("vite:afterUpdate", rerun);
    return () => import.meta.hot?.off("vite:afterUpdate", rerun);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let restoreConsole: (() => void) | null = null;
    const fullKey = resolveModuleKey(moduleKey);

    setPhase({ name: "server-rendering" });
    setConsoleMessages([]);

    // Fresh worker per run: a new worker builds a fresh module graph, so the
    // student's latest saved code is always what the "server" renders.
    const worker = new Worker(new URL("./ssrWorker.ts", import.meta.url), {
      type: "module",
    });
    const runId = runToken;

    worker.onerror = (event) => {
      if (cancelled) return;
      clearTimeout(timeout);
      worker.terminate();
      setPhase({
        name: "server-crashed",
        error: {
          name: "WorkerError",
          message:
            event.message ||
            "The SSR worker failed to load (see browser console)",
          stack: event.filename ? `${event.filename}:${event.lineno}` : "",
        },
      });
    };

    const timeout = setTimeout(() => {
      if (cancelled) return;
      worker.terminate();
      setPhase({
        name: "server-crashed",
        error: {
          name: "TimeoutError",
          message: `Server render did not finish within ${WORKER_TIMEOUT_MS / 1000}s (infinite loop?)`,
          stack: "",
        },
      });
    }, WORKER_TIMEOUT_MS);

    worker.onmessage = async (event: MessageEvent<RenderResponse>) => {
      const response = event.data;
      if (cancelled || response.runId !== runId) return;
      clearTimeout(timeout);
      worker.terminate();

      if (!response.ok) {
        setPhase({ name: "server-crashed", error: response.error });
        return;
      }

      const { html, durationMs } = response;
      setPhase({ name: "hydrating", html, durationMs });

      // Load the same module on the main thread for hydration.
      const loader = exerciseModules[fullKey];
      const mod = (await loader?.()) as Record<string, unknown> | undefined;
      const Component = mod?.[exportName];
      const container = containerRef.current;
      if (cancelled || typeof Component !== "function" || !container) return;

      // Reset any previous hydration.
      rootRef.current?.unmount();
      rootRef.current = null;
      container.innerHTML = html;

      // Capture console output during the hydration window — this is where
      // React 19 reports hydration mismatches.
      const captured: string[] = [];
      const pushCaptured = (prefix: string, args: unknown[]) => {
        captured.push(`${prefix}${formatConsoleArgs(args)}`);
        if (!cancelled) setConsoleMessages([...captured]);
      };
      const originalError = console.error;
      const originalWarn = console.warn;
      console.error = (...args: unknown[]) => {
        pushCaptured("", args);
        originalError.apply(console, args);
      };
      console.warn = (...args: unknown[]) => {
        pushCaptured("", args);
        originalWarn.apply(console, args);
      };
      restoreConsole = () => {
        console.error = originalError;
        console.warn = originalWarn;
        restoreConsole = null;
      };

      rootRef.current = hydrateRoot(
        container,
        createElement(Component as ComponentType),
        {
          onRecoverableError: (error) => {
            pushCaptured("[onRecoverableError] ", [
              error instanceof Error ? error.message : String(error),
            ]);
          },
        },
      );

      setTimeout(() => {
        restoreConsole?.();
        if (!cancelled) setPhase({ name: "done", html, durationMs });
      }, CONSOLE_CAPTURE_MS);
    };

    const request: RenderRequest = { runId, moduleKey: fullKey, exportName };
    worker.postMessage(request);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      worker.terminate();
      restoreConsole?.();
      // Defer the unmount: this cleanup can run while React is rendering
      // (re-run, wrapper switch, HMR), and unmounting a root synchronously
      // during a render is not allowed.
      const root = rootRef.current;
      rootRef.current = null;
      if (root) {
        setTimeout(() => root.unmount(), 0);
      }
    };
  }, [runToken, moduleKey, exportName]);

  const serverCrashed = phase.name === "server-crashed";
  const serverDone = phase.name === "hydrating" || phase.name === "done";

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0 }}>{title ?? "Fake-SSR simulator"}</h2>
        <button onClick={() => setRunToken((t) => t + 1)}>
          Re-run simulation
        </button>
      </div>

      {/* Pane 1: server render */}
      <div style={paneStyle}>
        <PaneTitle>
          1. Server render{" "}
          <small style={{ fontWeight: 400 }}>
            (Web Worker — no window, no localStorage, no DOM)
          </small>
        </PaneTitle>
        {phase.name === "server-rendering" && (
          <StatusBadge kind="pending">Rendering on the server…</StatusBadge>
        )}
        {serverCrashed && (
          <div>
            <StatusBadge kind="error">Server crashed</StatusBadge>
            <pre
              style={{
                background: "#fce8e6",
                color: "#c5221f",
                padding: 12,
                borderRadius: 4,
                overflowX: "auto",
              }}
            >
              {phase.error.name}: {phase.error.message}
            </pre>
            {phase.error.stack && (
              <details>
                <summary>Stack trace</summary>
                <pre style={{ overflowX: "auto", fontSize: 12 }}>
                  {phase.error.stack}
                </pre>
              </details>
            )}
            <p style={{ color: "#5f6368", fontSize: 13 }}>
              This is exactly what a real Node server would throw. Fix the
              crash and save — the simulation re-runs automatically.
            </p>
          </div>
        )}
        {serverDone && (
          <div>
            <StatusBadge kind="ok">
              Rendered to HTML in {phase.durationMs}ms
            </StatusBadge>
            <details style={{ marginTop: 8 }}>
              <summary>Show server HTML</summary>
              <pre
                style={{
                  background: "#f1f3f4",
                  padding: 12,
                  borderRadius: 4,
                  overflowX: "auto",
                  fontSize: 12,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {phase.html}
              </pre>
            </details>
          </div>
        )}
      </div>

      {/* Pane 2: client hydration */}
      <div style={paneStyle}>
        <PaneTitle>2. Client hydration</PaneTitle>
        {serverCrashed && (
          <StatusBadge kind="skipped">
            Skipped — nothing to hydrate, the server produced no HTML
          </StatusBadge>
        )}
        <div ref={containerRef} />
      </div>

      {/* Pane 3: hydration console */}
      <div style={paneStyle}>
        <PaneTitle>3. Hydration console</PaneTitle>
        {serverCrashed && <StatusBadge kind="skipped">Skipped</StatusBadge>}
        {phase.name === "done" && consoleMessages.length === 0 && (
          <StatusBadge kind="ok">
            No hydration mismatches — server HTML matched the client render
          </StatusBadge>
        )}
        {consoleMessages.length > 0 && (
          <div>
            <StatusBadge kind="error">
              {consoleMessages.length} message
              {consoleMessages.length > 1 ? "s" : ""} during hydration
            </StatusBadge>
            {consoleMessages.map((message, index) => (
              <pre
                key={index}
                style={{
                  background: "#fef7e0",
                  color: "#b06000",
                  padding: 12,
                  borderRadius: 4,
                  overflowX: "auto",
                  fontSize: 12,
                  whiteSpace: "pre-wrap",
                }}
              >
                {message}
              </pre>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
