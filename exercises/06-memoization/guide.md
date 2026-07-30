# Exercise 06: Way to get to the solution

### Start by reading the RecipeFeed component

You see four hooks that look like performance optimizations: a `useMemo`, another `useMemo`, yet another `useMemo`, and a `useCallback`. Then in Problems 5 and 6, a `React.memo` wrapper and a search filter. Let's examine each one and ask: is this memo actually doing anything useful?

---

## Problem 1: The useMemo on a ternary

```tsx
const RecipeComponent = useMemo(() => {
  if (displayMode === "card") {
    return CardView;
  } else {
    return RowView;
  }
}, [displayMode]);
```

### Step 1: What is this useMemo wrapping?

A conditional that returns one of two component references. Both `CardView` and `RowView` are defined at module scope, so they are already stable references.

### Step 2: Is this computation expensive?

It is a single `if/else` that returns a constant. That is about as cheap as a computation can get. `useMemo` itself has overhead: it stores the previous result, compares the dependency array, and decides whether to reuse or recompute. For a ternary, that overhead exceeds the cost of just running the ternary.

### Step 3: What is the fix?

Remove the `useMemo`. A plain ternary does the same thing for less cost:

```tsx
const RecipeComponent = displayMode === "card" ? CardView : RowView;
```

---

## Problem 2: The useMemo with formatDuration

```tsx
const formatDuration = (minutes: number) =>
  `${Math.floor(minutes / 60)}h ${minutes % 60}min`;

const annotatedRecipes = useMemo(
  () => recipes.map((r) => ({
    ...r,
    displayDuration: formatDuration(r.durationMinutes),
  })),
  [recipes, formatDuration],
);
```

### Step 1: Are all the dependencies stable across renders?

Look at the dependency array: `[recipes, formatDuration]`. Where is `formatDuration` defined? Inside the component body, as a plain function declaration. That means it is recreated on every render. Every render produces a new function reference, so `formatDuration` is never the same between renders.

### Step 2: So what does useMemo actually cache here?

Nothing. Since one of its dependencies changes every render, the memo recomputes every render. It is paying the overhead of dependency comparison while caching nothing.

### Step 3: What is the fix?

Two options. First, `formatDuration` does not read any props or state, so move it to module scope. It becomes a stable reference for free:

```tsx
// Outside the component
const formatDuration = (minutes: number) =>
  `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
```

Second, the `.map()` over a small list is not expensive enough to memoize in the first place. Remove the `useMemo` entirely and just compute inline:

```tsx
const annotatedRecipes = recipes.map((r) => ({
  ...r,
  displayDuration: formatDuration(r.durationMinutes),
}));
```

---

## Problem 3: The useMemo on Boolean()

```tsx
const isContentExpanded = useMemo(() => Boolean(isExpanded), [isExpanded]);
```

### Step 1: Is this computation expensive?

`Boolean(isExpanded)` is a type cast. It is one of the cheapest operations JavaScript can perform. The `useMemo` wrapper costs more than the computation itself.

### Step 2: What is the fix?

Remove the `useMemo`:

```tsx
const isContentExpanded = Boolean(isExpanded);
```

Rule of thumb: if the computation takes less than roughly 1ms, memoizing it adds overhead rather than saving it.

---

## Problem 4: The useCallback with a state dependency

```tsx
const sortByDuration = useCallback(
  (a: Recipe, b: Recipe) =>
    sortDirection === "asc"
      ? a.durationMinutes - b.durationMinutes
      : b.durationMinutes - a.durationMinutes,
  [sortDirection],
);
```

### Step 1: What happens when sortDirection changes?

The dependency `[sortDirection]` changes, so `useCallback` returns a new function. Every time the user toggles the sort direction, the memoized function is discarded and recreated. The `useCallback` only caches the function between direction changes, which is a narrow window.

### Step 2: Does this function need to close over state at all?

Look at what it does: it picks between ascending and descending comparison. Those two comparison functions are pure. They do not depend on any component state. They could live at module scope:

```tsx
// Outside the component
const sortAsc = (a: Recipe, b: Recipe) => a.durationMinutes - b.durationMinutes;
const sortDesc = (a: Recipe, b: Recipe) => b.durationMinutes - a.durationMinutes;

// Inside the component
const comparator = sortDirection === "asc" ? sortAsc : sortDesc;
```

No `useCallback`, no dependency array. A plain ternary selects between two stable references.

---

## Problem 5: React.memo on ItemCard

The parent re-renders every second (a timer increments `tick`). `ItemCard` is wrapped in `React.memo`. Yet the render counts on the cards still increment every second.

### Step 1: If memo is applied, why is it not working?

`React.memo` does shallow comparison on all props. If every prop is referentially identical between renders, memo skips the re-render. So at least one prop must be changing. Look at the JSX:

```tsx
<ItemCard
  key={item.id}
  item={item}
  style={index === 0 ? { border: "1px solid red" } : undefined}
/>
```

### Step 2: Which prop is unstable?

`item` comes from the `ITEMS` array defined at module scope. That is stable. But `{ border: "1px solid red" }` is an inline object literal. Every render creates a new object. Even though the contents are identical, the reference is different. `React.memo`'s shallow comparison sees a "new" `style` prop and re-renders.

### Step 3: What is the fix?

Extract the style object to module scope so it is the same reference every render:

```tsx
const FEATURED_STYLE = { border: "1px solid red" };

// Inside component
<ItemCard
  key={item.id}
  item={item}
  style={index === 0 ? FEATURED_STYLE : undefined}
/>
```

After fixing, watch the RenderCount badges. They should stay at 1 even as the timer ticks.

---

## Problem 6: Input lag from synchronous filtering

Type in the search box. Every keystroke triggers a synchronous re-render of all `ItemCard` components. Since each card has an artificial 8ms busy wait, the input feels sluggish.

### Step 1: What is happening on each keystroke?

The `search` state updates, the component re-renders, the filter runs, and all matching `ItemCard` components render synchronously before the browser can update the input. The input feels frozen until the expensive render finishes.

### Step 2: How do you keep the input responsive while the list catches up?

Wrap the search value in `useDeferredValue`:

```tsx
const deferredSearch = useDeferredValue(search);

const filteredItems = ITEMS.filter((item) =>
  item.name.toLowerCase().includes(deferredSearch.toLowerCase()),
);
```

React renders with the old `deferredSearch` immediately (so the input updates instantly), then re-renders with the new value at lower priority. If the user types again before the deferred render finishes, React abandons it and starts over. No wasted work, no input lag.

### Valid alternative: useTransition

`useTransition` also solves this. Wrap the state setter:

```tsx
const [isPending, startTransition] = useTransition();
const handleChange = (e) => {
  startTransition(() => setSearch(e.target.value));
};
```

The trade off: `useDeferredValue` is applied at the consumer (the filtering code), while `useTransition` is applied at the producer (the onChange handler). `useDeferredValue` is often simpler when you do not control the state setter.

---

## Verify

After fixing all six problems, notice the pattern. For each memo, the same questions surfaced: Is the computation expensive? Are the dependencies stable? Can I restructure to avoid memoization entirely? Most of the time the answer was "remove it" or "move the function out of the component."

---

## "So when IS memoization the right call?"

This exercise only showed cases where memoization was wrong. That might leave you thinking you should never use it. But there are real cases where `useMemo` earns its place.

**Stabilizing an object that gets passed as a prop or used in a dependency array.**

Imagine a component that builds a filter config from props:

```tsx
function ProductList({ category, sortBy }) {
  const filters = { category, sortBy };

  return <FilteredResults filters={filters} />;
}
```

`filters` is a new object every render. If `FilteredResults` is wrapped in `React.memo`, the memo never skips because `filters` is always a new reference. If `filters` is used in a `useEffect` dependency array, the effect re-runs every render.

Moving the object to module scope doesn't work here because it depends on props. You can't extract it. This is where `useMemo` is the right tool:

```tsx
const filters = useMemo(
  () => ({ category, sortBy }),
  [category, sortBy],
);
```

Now `filters` keeps the same reference as long as `category` and `sortBy` don't change. `React.memo` on children works. Effects with `filters` in deps only re-run when the values actually change.

> **Caveat:** `useMemo` is a performance hint, not a guarantee. React may discard memoized values and recompute them (for example, to free memory). That is fine for optimizations like the one above, but if your logic *requires* an identity that stays stable across renders, `useRef` is the correct tool.

**The same applies to arrays and callbacks:**

- `useMemo` for an array built from props/state that gets passed to a memoized child
- `useCallback` for a function passed to a `React.memo`'d child or used in a dependency array

**The test is always the same:** does something downstream (a memoized child, an effect, a dependency array) depend on this reference being stable? If yes, and you can't move it to module scope, `useMemo` / `useCallback` is the correct answer.

---

## "What about useCallback when the function depends on a prop callback?"

This is a harder case. Imagine a component that receives an `onChange` callback from the parent and uses it in an effect:

```tsx
function SearchInput({ onChange }) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    onChange(query);
  }, [query, onChange]);

  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

If the parent passes an inline function (`<SearchInput onChange={(q) => setFilters({ query: q })} />`), `onChange` is a new reference every render, and the effect re-runs on every parent render even when `query` hasn't changed.

There are several ways to handle this, each with trade-offs.

**Option 1: Let the caller stabilize the callback.**

The component documents that `onChange` should be a stable reference. The parent wraps it in `useCallback`:

```tsx
const handleChange = useCallback((q) => {
  setFilters({ query: q });
}, []);

<SearchInput onChange={handleChange} />
```

This works but pushes the burden to every consumer. If one caller forgets, the effect silently runs too often. The component is fragile because its correctness depends on something it doesn't control.

**Option 2: Stabilize internally with a ref.**

The component stores the latest `onChange` in a ref and calls the ref in the effect. The effect depends only on `query`, not on the callback identity:

```tsx
function SearchInput({ onChange }) {
  const [query, setQuery] = useState("");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    onChangeRef.current(query);
  }, [query]);

  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

The ref always holds the latest callback, so the effect always calls the right function. But the effect's dependency array doesn't include `onChange`, which means the linter will complain and the connection between the prop and the effect is invisible. You're telling React "this doesn't depend on onChange" when it actually does. It works, but it's a lie to the dependency array.

**Option 3: useEffectEvent.**

`useEffectEvent` is stable as of React 19.2 (the version this repo uses) and is imported directly from `"react"`. You already used it hands-on in Exercise 05 (Effect C: the subscription that must see the latest guest count without re-subscribing). It is designed for exactly this case: it creates a stable function that always reads the latest props/state without appearing in the dependency array:

```tsx
function SearchInput({ onChange }) {
  const [query, setQuery] = useState("");

  const onQueryChange = useEffectEvent((q: string) => {
    onChange(q);
  });

  useEffect(() => {
    onQueryChange(query);
  }, [query]);

  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

`onQueryChange` is stable (never changes identity) but always calls the latest `onChange`. The dependency array is honest: the effect re-runs when `query` changes, and the callback it fires is always current.

**Important limitation:** `useEffectEvent` only works inside `useEffect`. You cannot use it to stabilize a callback that you pass as a prop to a child or use in a `useCallback`. It solves the "unstable callback in an effect dependency" problem specifically, not the general "I need a stable function reference" problem.

**Which option to use?**

| Approach | Who is responsible? | Downsides |
|---|---|---|
| Caller stabilizes with `useCallback` | The parent | Fragile. Every consumer must remember. One inline function breaks it. |
| Internal ref | The component | Dependency array lie. Linter warning. Hidden connection. |
| `useEffectEvent` | React | Only works inside effects. Cannot stabilize callbacks passed as props. |

For effects that depend on a prop callback, `useEffectEvent` is the cleanest solution in React 19.2. For callbacks that need to be stable as props (e.g., passed to a `React.memo`'d child), the ref approach is the most common pattern in production codebases. It's a pragmatic trade-off. Be aware of what you're doing: you're decoupling the effect from a value it actually depends on. Document it clearly so future readers understand why the ref exists.

## Key reading

- [useMemo](https://react.dev/reference/react/useMemo)
- [React re-renders guide](https://www.developerway.com/posts/react-re-renders-guide)
