/**
 * Exercise 12: SSR & Hydration
 * ==============================
 *
 * Mental model: Server has no window, no localStorage, no DOM. The FIRST
 * client render MUST produce identical HTML to what the server rendered —
 * any difference is a hydration mismatch.
 *
 * If you get stuck, open guide.md for step-by-step thinking.
 *
 * Fix three problems below: two server crashes and one hydration mismatch.
 */

import type { FunctionComponent } from "react";
import { useState, useSyncExternalStore } from "react";

// ---------------------------------------------------------------------------
// Exercise A: ResponsiveLayout — window.innerWidth crash
//
// This component crashes on the server because `window` is not defined.
// It reads window.innerWidth directly during render.
//
// TODO: Fix the server crash.
//   Step 1: window.innerWidth crashes on the server. You need an API that
//           provides a server-safe default AND subscribes to changes on client.
//   Step 2: useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
//           - subscribe: listen for 'resize' events
//           - getSnapshot: return window.innerWidth
//           - getServerSnapshot: return null (safe default for server)
//   Step 3: When width is null (server + first client render), render a
//           placeholder. After hydration, the real width takes over.
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
// Exercise B: ThemeSelector — localStorage crash + hydration mismatch
//
// Bug 1: This crashes on the server because localStorage is not defined.
// The useState initializer runs during render on the server.
//
// Bug 2: Math.random() generates a different id on server vs client,
// producing a hydration mismatch on the id/htmlFor attributes.
//
// TODO: Fix Bug 1 — localStorage crash on server.
//   Step 1: The useState initializer runs during render — including on server.
//   Step 2: Extract a function (e.g., getInitialTheme) that checks
//           `typeof window === "undefined"` and returns "light" as default.
//   Step 3: Pass the function REFERENCE to useState (not a function call):
//           `useState(getInitialTheme)` — React calls it once on mount.
//
// TODO: Fix Bug 2 — Math.random() hydration mismatch.
//   Step 1: Math.random() produces different values on server vs client.
//   Step 2: useId() generates a stable identifier that matches both sides.
//   Key reading: https://react.dev/reference/react/useId
// ---------------------------------------------------------------------------

export const ThemeSelector: FunctionComponent = () => {
  // Bug 1: localStorage is not defined on the server — this crashes SSR
  const [theme, setTheme] = useState<"light" | "dark">(
    localStorage.getItem("theme") === "dark" ? "dark" : "light",
  );

  // Bug 2: Math.random() produces a different value on server vs client
  // → the id attribute in SSR HTML won't match during hydration
  const selectId = `theme-${Math.random().toString(36).slice(2)}`;

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

