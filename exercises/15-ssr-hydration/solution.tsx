/**
 * Exercise 15: SSR & Hydration — SOLUTION
 * =========================================
 */

import type { FunctionComponent } from "react";
import { useEffect, useState, useSyncExternalStore } from "react";

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
// getServerSnapshot returns null → server and hydration both render null.
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
// Solution B: typeof window guard in useState initializer
//
// The initializer function runs once on first render. On the server,
// typeof window === "undefined" so we return the safe default "light".
// On the client (first render / hydration), the guard also returns "light"
// unless we've already stored a value in localStorage — which is fine because
// the client's initializer runs AFTER hydration, so the state starts at
// whatever the server sent, then React picks up the client's initializer value.
//
// Note: pass getInitialTheme as a function reference, not getInitialTheme(),
// so React only calls it once on mount instead of on every render.
// ---------------------------------------------------------------------------

const getInitialTheme = (): "light" | "dark" => {
  if (typeof window === "undefined") return "light";
  return localStorage.getItem("theme") === "dark" ? "dark" : "light";
};

export const ThemeSelector: FunctionComponent = () => {
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);

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
// Solution C: Static format first, relative time after hydration
//
// formatDate(createdAt) is deterministic — new Date(timestamp).toLocaleDateString
// produces the same string on both server and client for the same input.
// getRelativeTime(createdAt) calls Date.now() — different on server vs. client.
// We initialize state with formatDate, then switch to relative time in useEffect
// (which only runs on the client, after hydration).
// ---------------------------------------------------------------------------

interface PostProps {
  authorName: string;
  content: string;
  createdAt: number;
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
  // Start with a deterministic format that's the same on server and client
  const [timeDisplay, setTimeDisplay] = useState(() => formatDate(createdAt));

  // After hydration, switch to relative time and keep it updated every minute
  useEffect(() => {
    setTimeDisplay(getRelativeTime(createdAt));

    const interval = setInterval(() => {
      setTimeDisplay(getRelativeTime(createdAt));
    }, 60000);

    return () => clearInterval(interval);
  }, [createdAt]);

  return (
    <div style={{ padding: 16, border: "1px solid #ddd", marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <strong>{authorName}</strong>
        <span style={{ color: "#666" }}>{timeDisplay}</span>
      </div>
      <p>{content}</p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Solution D: null → boolean for matchMedia
//
// Same pattern as domains/spending/src/spending.tsx:
//   const [isMobileTablet, setIsMobileTablet] = useState<boolean | null>(null);
//
// null is the same on server and client — no mismatch.
// After hydration, useEffect reads the real matchMedia value and updates.
// Also subscribes to OS dark-mode changes so the card stays in sync.
// ---------------------------------------------------------------------------

export const AdaptiveCard: FunctionComponent = () => {
  // null = "we don't know yet" — deterministic, same on server and during hydration
  const [prefersDark, setPrefersDark] = useState<boolean | null>(null);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    setPrefersDark(mql.matches);

    // Keep in sync when the user toggles OS dark mode
    const handler = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // While prefersDark is null, show a neutral style that matches the server HTML
  return (
    <div
      style={{
        padding: 16,
        background: prefersDark === null ? "#f5f5f5" : prefersDark ? "#1e1e1e" : "#ffffff",
        color: prefersDark === null ? "#333" : prefersDark ? "#ffffff" : "#1e1e1e",
        border: "1px solid #ddd",
        borderRadius: 8,
      }}
    >
      <h3>Adaptive Card</h3>
      <p>This card adapts to your color scheme preference.</p>
      <p>Current mode: {prefersDark === null ? "Detecting..." : prefersDark ? "Dark" : "Light"}</p>
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
 * Four patterns:
 *   A. useSyncExternalStore with getServerSnapshot — cleanest for browser APIs
 *   B. typeof window guard — simple one-time reads (localStorage, URL hash)
 *   C. Static-first, dynamic-after-hydration — for Date.now() or other non-deterministic values
 *   D. null → boolean — null is deterministic on both sides; update in useEffect
 *
 * Why not just useEffect everything?
 *   useEffect never runs on the server. The first client render MUST match the
 *   server HTML. useEffect fires AFTER hydration — so the initial state must
 *   be safe to show. useSyncExternalStore avoids the flash for subscribable values.
 *
 * Real codebase references:
 *   - blocks/client-side-render/src/clientSideRender.tsx: useSyncExternalStore for SSR
 *   - domains/spending/src/spending.tsx: typeof window guard + null→boolean pattern
 *
 * >> INSTRUCTOR: Use the discussion-notes.md file for the RSC/Streaming/ViewTransition
 * >> discussion after the exercise. Key takeaway for students:
 * >> "Server Components never hydrate. Client Components always do."
 */
