# Exercise 12: Way to get to the solution

## How this exercise is run: the fake-SSR simulator

Unlike the other exercises, this one renders your component twice, just like a real SSR app:

1. **Server render** — your component is rendered to an HTML string inside a **Web Worker**. A worker is a JavaScript environment with no `window`, no `localStorage`, and no DOM — exactly like Node on a real server. Server-only bugs crash here for real.
2. **Client hydration** — the worker's HTML is injected into the page and hydrated with `hydrateRoot`. Any difference between the server HTML and the first client render shows up in the **hydration console** pane as React's real mismatch warning.

Fix the bugs one at a time and save — the simulation re-runs automatically. You'll see the panes go from red to green as you progress.

## Exercise A: ResponsiveLayout

### Start by looking at the server render pane

It shows `ReferenceError: window is not defined`. Now imagine this component runs on the server — because it just did.

Look at the first line of the component body:

```tsx
const width = window.innerWidth;
```

On the server, there is no `window`. There is no browser, no viewport, no DOM. This line throws `ReferenceError: window is not defined` and the entire server render crashes.

### Step 1: What do you need here?

You need a value that:
- Has a safe default on the server (where `window` doesn't exist)
- Reads the real value on the client
- Updates when the window resizes

That's three requirements. A simple `typeof window` guard handles the first two, but not the third. `useState` with a `useEffect` could work, but there's a hook designed exactly for this pattern.

### Step 2: Discover useSyncExternalStore

`useSyncExternalStore` takes three arguments:

```tsx
const width = useSyncExternalStore(
  subscribeToResize,          // subscribe: listen for changes on client
  () => window.innerWidth,    // getSnapshot: read current value on client
  () => null,                 // getServerSnapshot: safe default for server
);
```

Here's what happens at each phase:

- **Server render**: calls `getServerSnapshot`, gets `null`. Renders a placeholder.
- **First client render (hydration)**: also uses `getServerSnapshot` so the HTML matches what the server produced. No mismatch.
- **After hydration**: `getSnapshot` takes over. The real `window.innerWidth` value appears. The `subscribe` function listens for resize events and triggers re-renders.

When `width` is `null`, render a placeholder instead of the mobile/desktop layout. After hydration, the real layout appears.

### Step 3: Verify

Save and watch the simulator: the server render pane should turn green (no crash — inspect the HTML, it contains your placeholder). The next crash (`localStorage is not defined`) appears — that's Exercise B.

---

## Exercise B1: ThemeSelector — localStorage crash

### Step 1: Look at the useState initializer

```tsx
const [theme, setTheme] = useState<"light" | "dark">(
  localStorage.getItem("theme") === "dark" ? "dark" : "light",
);
```

The initializer expression runs during render. On the server, `localStorage` is not defined. Same crash as Exercise A, different browser API.

### Step 2: How do you provide a safe default for the server?

Extract the initializer into a function that checks for the server environment:

```tsx
const getInitialTheme = (): "light" | "dark" => {
  if (typeof window === "undefined") return "light";  // server default
  return localStorage.getItem("theme") === "dark" ? "dark" : "light";
};
```

Pass the function *reference* to `useState`, not the result of calling it:

```tsx
const [theme, setTheme] = useState(getInitialTheme);  // function reference, not call!
```

Be precise about what fixes what here. The initializer runs during the **first render — including the server render** (`renderToString` calls it too). So the lazy function form alone would still crash on the server; it's the `typeof window` guard *inside* the function that prevents the crash. On the server the guard returns `"light"`; on the client it reads from `localStorage`.

**Important**: `useState(getInitialTheme)` passes the function — React calls it only on the first render. `useState(getInitialTheme())` calls it on *every* render and throws away the result after the first. Both fix the crash (the guard does that), but the function form is the idiomatic pattern for expensive or environment-dependent initializers.

### Step 3: Verify

Save: the server render pane turns green and the client hydration pane now shows the live app. But look at the hydration console pane — there's a mismatch warning. That's Bug 2.

---

## Exercise B2: ThemeSelector — hydration mismatch

### Step 1: Read the mismatch warning in the hydration console

The simulator captured React's real diagnostic. At the bottom of it there's a diff: the server rendered `id="theme-…"` with one random string, the client rendered another. Now look at the id generation:

```tsx
const selectId = `theme-${Math.random().toString(36).slice(2)}`;
```

`Math.random()` runs during render. It produces a different value on the server than on the client. The server HTML has `id="theme-abc123"` but the client render produces `id="theme-xyz789"`. React detects the mismatch and warns (or, in strict mode, may re-render).

### Step 2: How do you generate an ID that matches on both sides?

`useId()` generates a stable identifier that React guarantees will be the same on server and client:

```tsx
const selectId = useId();  // same value on server and client
```

No `Math.random()`, no mismatch.

### Step 3: Verify

Save: all three panes should be green — server render succeeds, the app hydrates, and the hydration console reports "No hydration mismatches". Compare with `?ex=12-solution` if anything still differs.

---

## Why not just useEffect for everything?

You might think: "I'll render `null` on the server, then fix everything in `useEffect`." That technically works, but `useEffect` fires **after** hydration and painting. The user sees a flash of the placeholder before the real content appears.

`useSyncExternalStore` avoids the flash for subscribable values by providing a server snapshot that both server and first client render agree on. The transition from placeholder to real value happens as part of React's normal reconciliation, not as a visible flash.

---

## Caveat: useSyncExternalStore and async React

`useSyncExternalStore` works well for the exercise's use case (read a browser value, subscribe to changes). But it has a significant limitation in React 19's async rendering model.

### The problem

When an external store mutates, `useSyncExternalStore` always triggers a synchronous re-render. It cannot participate in transitions. That means:

- If a Suspense boundary is above the component, a store mutation can trigger the fallback even if the component was already showing content.
- Wrapping the store update in `startTransition` does not help. External store changes bypass the transition mechanism entirely.
- This makes `useSyncExternalStore` incompatible with patterns where you want to keep old content visible while new data loads (the pattern from Exercise 10's "Beyond the exercise" section).

### Why does this happen?

React's transition system works by deferring state updates and rendering them at low priority. But external stores live outside React's state model. When the store changes, React has to synchronously re-render to stay consistent with the external truth. It cannot "defer" an external mutation because it doesn't control the store.

### What are the alternatives?

For values like `window.innerWidth` that you read once and subscribe to, `useSyncExternalStore` is still the right choice. The limitation only matters when the store mutates frequently and you need those mutations to participate in transitions.

For state that needs to work with transitions and Suspense:

- **Use React state** (`useState`, `useReducer`) instead of an external store. React state participates in transitions natively.
- **React Compiler** (when adopted) automatically prevents unnecessary Suspense fallbacks, which mitigates some of these issues.
- **Keep external stores for truly external data** (browser APIs, third-party libraries) and use React state for application state that interacts with Suspense boundaries.

For a deeper dive into which patterns trigger Suspense fallbacks during hydration and transitions, see [github.com/jantimon/react-hydration-rules](https://github.com/jantimon/react-hydration-rules).

---

## Key reading

- [useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)
- [useId](https://react.dev/reference/react/useId)
- [Making Sense of React Server Components](https://www.joshwcomeau.com/react/server-components/)
