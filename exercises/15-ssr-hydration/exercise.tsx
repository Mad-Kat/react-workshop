/**
 * Exercise 15: SSR & Hydration
 * ==============================
 *
 * Mental model: SSR renders HTML on the server; the client hydrates it by
 * attaching event listeners to the existing DOM. Both passes run your hooks.
 * Server has no window, no localStorage, no DOM. The FIRST client render must
 * produce identical HTML to what the server rendered — any difference is a
 * hydration mismatch.
 *
 * These are patterns found in our codebase.
 *
 * Fix four components that crash on the server or produce hydration mismatches.
 */

import type { FunctionComponent } from "react";
import { useEffect, useState, useSyncExternalStore } from "react";

// ---------------------------------------------------------------------------
// PROVIDED: useIsHydrated helper (don't modify)
//
// Uses useSyncExternalStore so the server snapshot (false) is distinct from
// the client snapshot (true). Safe to use as a hydration gate.
// Same implementation as blocks/client-side-render/src/useIsHydrated.ts
// ---------------------------------------------------------------------------

const emptySubscribe = () => () => {};
const returnTrueFn = () => true;
const returnFalseFn = () => false;

function useIsHydrated(): boolean {
  return useSyncExternalStore(emptySubscribe, returnTrueFn, returnFalseFn);
}

// ---------------------------------------------------------------------------
// Exercise A: ResponsiveLayout — window.innerWidth crash
//
// This component crashes on the server because `window` is not defined.
// It reads window.innerWidth directly during render.
//
// TODO: Fix using useSyncExternalStore with a getServerSnapshot that returns null.
//       While width is null (server + hydration), render a safe fallback.
//       On the client, subscribe to resize events for live updates.
// ---------------------------------------------------------------------------

export const ResponsiveLayout: FunctionComponent = () => {
  // Bug: window is not defined on the server — this crashes SSR
  const width = window.innerWidth;
  const isMobile = width < 768;

  return (
    <div>
      <h2>Responsive Layout</h2>
      <p>Window width: {width}px</p>
      {isMobile ? (
        <div style={{ background: "#e3f2fd", padding: 16 }}>
          Mobile layout — stacked
        </div>
      ) : (
        <div style={{ background: "#f3e5f5", padding: 16, display: "flex", gap: 16 }}>
          <div style={{ flex: 1 }}>Desktop column 1</div>
          <div style={{ flex: 1 }}>Desktop column 2</div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Exercise B: ThemeSelector — localStorage crash
//
// This crashes on the server because localStorage is not defined.
// The useState initializer runs during render on the server.
//
// TODO: Fix using a typeof window guard in the initializer function.
//       The server (and first client render) should default to "light".
// ---------------------------------------------------------------------------

export const ThemeSelector: FunctionComponent = () => {
  // Bug: localStorage is not defined on the server — this crashes SSR
  const [theme, setTheme] = useState<"light" | "dark">(
    localStorage.getItem("theme") === "dark" ? "dark" : "light",
  );

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  return (
    <div
      style={{
        background: theme === "dark" ? "#333" : "#fff",
        color: theme === "dark" ? "#fff" : "#333",
        padding: 16,
      }}
    >
      <h2>Theme: {theme}</h2>
      <button onClick={toggleTheme}>Toggle theme</button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Exercise C: Post — Date.now() hydration mismatch
//
// This component doesn't crash, but produces a React hydration warning.
// getRelativeTime(createdAt) calls Date.now() during render. The server
// computes the value at time T. The client rehydrates at T+2s and computes
// a different value. The HTML strings don't match.
//
// TODO: Render a static, deterministic date string on first render (same on
//       server and client), then update to the relative "Xm ago" format via
//       useEffect after hydration.
// ---------------------------------------------------------------------------

interface PostProps {
  authorName: string;
  content: string;
  createdAt: number; // Unix timestamp in milliseconds
}

const getRelativeTime = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString("en-CH", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const Post: FunctionComponent<PostProps> = ({ authorName, content, createdAt }) => {
  // Bug: Date.now() produces different values on server vs client → hydration mismatch
  const timeAgo = getRelativeTime(createdAt);

  return (
    <div style={{ padding: 16, border: "1px solid #ddd", marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <strong>{authorName}</strong>
        <span style={{ color: "#666" }}>{timeAgo}</span>
      </div>
      <p>{content}</p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Exercise D: AdaptiveCard — matchMedia hydration mismatch
//
// matchMedia doesn't exist on the server. Even with a typeof guard, the
// existing code still produces a hydration mismatch:
//   - Server renders with prefersDark = false (no window)
//   - Client's FIRST render (hydration) MUST also be false to match
//   - But a user in dark mode sees false briefly before useEffect fires
//
// TODO: Fix using the null → boolean pattern:
//       useState<boolean | null>(null) — null on both server and hydration
//       (deterministic, no mismatch). Update to the real value in useEffect.
//       Show a neutral "Detecting..." style while null.
// ---------------------------------------------------------------------------

export const AdaptiveCard: FunctionComponent = () => {
  // Bug: even though typeof window protects the crash, this is still a mismatch.
  // Server sets prefersDark = false. Client's first render also sees false via
  // the guard. BUT computing it in render means a dark-mode user gets a flash
  // of light styles. More importantly: any difference between the initial
  // state and what the server rendered is a React hydration error.
  const prefersDark =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false;

  return (
    <div
      style={{
        padding: 16,
        background: prefersDark ? "#1e1e1e" : "#ffffff",
        color: prefersDark ? "#ffffff" : "#1e1e1e",
        border: "1px solid #ddd",
        borderRadius: 8,
      }}
    >
      <h3>Adaptive Card</h3>
      <p>This card adapts to your color scheme preference.</p>
      <p>Current mode: {prefersDark ? "Dark" : "Light"}</p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Combined demo
// ---------------------------------------------------------------------------

export const SSRExercises: FunctionComponent = () => {
  const now = Date.now();
  return (
    <div>
      <h1>SSR & Hydration Exercises</h1>

      <h2>A: window.innerWidth crash</h2>
      <ResponsiveLayout />

      <h2>B: localStorage crash</h2>
      <ThemeSelector />

      <h2>C: Date.now() mismatch</h2>
      <Post authorName="Alice" content="Just shipped the new feature!" createdAt={now - 180000} />
      <Post authorName="Bob" content="LGTM, merging now." createdAt={now - 3600000} />

      <h2>D: matchMedia mismatch</h2>
      <AdaptiveCard />
    </div>
  );
};

/**
 * Hints (try without these first):
 *
 * A: useSyncExternalStore has a third argument — getServerSnapshot. Return null from it.
 * B: useState accepts a function — check typeof window inside it.
 * C: formatDate(createdAt) is deterministic. getRelativeTime(createdAt) is not. Start with one, switch to the other.
 * D: What value is the same on server and client? null. Start there, update in useEffect.
 */
