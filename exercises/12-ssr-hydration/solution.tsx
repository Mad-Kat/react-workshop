/**
 * Exercise 12: SSR & Hydration — SOLUTION
 * =========================================
 */

import type { FunctionComponent } from "react";
import { useEffect, useId, useState, useSyncExternalStore } from "react";

// ---------------------------------------------------------------------------
// PROVIDED: useIsHydrated helper (same as exercise)
//
// useSyncExternalStore with empty subscribe, returnTrue on client, returnFalse
// as server snapshot. This gives us a boolean that's false on the server and
// on the first client render, then true after hydration completes.
// Same implementation as blocks/client-side-render/src/useIsHydrated.ts
// ---------------------------------------------------------------------------

const emptySubscribe = () => () => {};
const returnTrueFn = () => true;
const returnFalseFn = () => false;

function useIsHydrated(): boolean {
  return useSyncExternalStore(emptySubscribe, returnTrueFn, returnFalseFn);
}

// ---------------------------------------------------------------------------
// Solution A: useSyncExternalStore for window dimensions
//
// getServerSnapshot returns null -> server and hydration both render null.
// Client subscribes to resize events and gets live updates.
// When width is null, we render a safe fallback that matches the server HTML.
// ---------------------------------------------------------------------------

function subscribeToResize(callback: () => void): () => void {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

function getWidthSnapshot(): number {
  return window.innerWidth;
}

function getWidthServerSnapshot(): null {
  return null;
}

export const ResponsiveLayout: FunctionComponent = () => {
  const width = useSyncExternalStore(
    subscribeToResize,
    getWidthSnapshot,
    getWidthServerSnapshot,
  );

  // width is null during SSR and hydration — render a layout-neutral placeholder
  if (width === null) {
    return (
      <div>
        <h2>Responsive Layout</h2>
        <div style={{ padding: 16 }}>Loading layout...</div>
      </div>
    );
  }

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
// Solution B: typeof window guard + useId
//
// Fix 1 (localStorage crash): The initializer function runs once on first
// render. On the server, typeof window === "undefined" so we return "light".
//
// Note: pass getInitialTheme as a function reference, not getInitialTheme(),
// so React only calls it once on mount instead of on every render.
//
// Fix 2 (hydration mismatch): useId() generates a stable identifier that is
// the same on server and client. Math.random() produces different values in
// each environment → the id attribute in the SSR HTML won't match the client,
// causing a hydration mismatch.
// ---------------------------------------------------------------------------

const getInitialTheme = (): "light" | "dark" => {
  if (typeof window === "undefined") return "light";
  return localStorage.getItem("theme") === "dark" ? "dark" : "light";
};

export const ThemeSelector: FunctionComponent = () => {
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);

  // Fix 2: useId — stable across server and client, no hydration mismatch
  const selectId = useId();

  const changeTheme = (newTheme: "light" | "dark") => {
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
      <h2>Theme</h2>
      <label htmlFor={selectId}>Choose theme: </label>
      <select
        id={selectId}
        value={theme}
        onChange={(e) => changeTheme(e.target.value as "light" | "dark")}
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Combined demo
// ---------------------------------------------------------------------------

export const SSRExercises: FunctionComponent = () => {
  return (
    <div>
      <h1>SSR & Hydration Exercises</h1>

      <h2>A: window.innerWidth crash</h2>
      <ResponsiveLayout />

      <h2>B: localStorage crash</h2>
      <ThemeSelector />
    </div>
  );
};

/**
 * Two patterns:
 *   A. useSyncExternalStore with getServerSnapshot — cleanest for browser APIs
 *   B1. typeof window guard — simple one-time reads (localStorage, URL hash)
 *   B2. useId — SSR-safe unique identifiers (labels, aria attributes, htmlFor)
 *
 * Why not just useEffect everything?
 *   useEffect never runs on the server. The first client render MUST match the
 *   server HTML. useEffect fires AFTER hydration — so the initial state must
 *   be safe to show. useSyncExternalStore avoids the flash for subscribable values.
 *
 * Real codebase references:
 *   - blocks/client-side-render/src/clientSideRender.tsx: useSyncExternalStore for SSR
 *   - domains/spending/src/spending.tsx: typeof window guard + null->boolean pattern
 *
 * >> INSTRUCTOR: Use the discussion-notes.md file for the RSC/Streaming/ViewTransition
 * >> discussion after the exercise. Key takeaway for students:
 * >> "Server Components never hydrate. Client Components always do."
 */
