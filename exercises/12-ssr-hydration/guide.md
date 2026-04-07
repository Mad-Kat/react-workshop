# Exercise 12: Way to get to the solution

## Exercise A: ResponsiveLayout

### Start by imagining this component runs on the server

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

The component should render a placeholder on the server (no crash), hydrate without a mismatch warning, then show the real width and correct layout.

---

## Exercise B: ThemeSelector (Bug 1, localStorage crash)

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

React only calls the initializer function once, on mount. On the server, it returns `"light"`. On the client, it reads from `localStorage`.

**Important**: `useState(getInitialTheme)` passes the function. `useState(getInitialTheme())` calls it immediately and passes the result. Both work here, but the function form is the idiomatic pattern for expensive or environment-dependent initializers.

### Step 3: Verify

The server render should produce the light theme without crashing. The client should pick up whatever is stored in `localStorage`.

---

## Exercise B: ThemeSelector (Bug 2, hydration mismatch)

### Step 1: Look at the id generation

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

There should be no hydration mismatch warning in the console. The `id` and `htmlFor` attributes should match between server HTML and client render.

---

## Why not just useEffect for everything?

You might think: "I'll render `null` on the server, then fix everything in `useEffect`." That technically works, but `useEffect` fires **after** hydration and painting. The user sees a flash of the placeholder before the real content appears.

`useSyncExternalStore` avoids the flash for subscribable values by providing a server snapshot that both server and first client render agree on. The transition from placeholder to real value happens as part of React's normal reconciliation, not as a visible flash.

---

## Key reading

- [useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)
- [useId](https://react.dev/reference/react/useId)
- [Making Sense of React Server Components](https://www.joshwcomeau.com/react/server-components/)
