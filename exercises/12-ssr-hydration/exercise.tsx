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
 * Fix two components that crash on the server or produce hydration mismatches.
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
 * Hints (try without these first):
 *
 * A: useSyncExternalStore has a third argument — getServerSnapshot. Return null from it.
 * B: useState accepts a function — check typeof window inside it.
 */
