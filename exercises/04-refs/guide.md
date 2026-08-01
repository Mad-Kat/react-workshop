# Exercise 04: Way to get to the solution

## Exercise A: WeatherStationPoller

### Start by listing all the useState calls

There are four:

```tsx
const [data, setData] = useState<WeatherReading | null>(null);
const [isFetching, setIsFetching] = useState(false);
const [intervalId, setIntervalId] = useState<...>(null);
const [timeoutId, setTimeoutId] = useState<...>(null);
```

### Step 1: Which of these are rendered in JSX?

Look at the return value of `useWeatherStationPoller`:

```tsx
return { data };
```

Only `data` leaves the hook. And in `WeatherStationDisplay`, only `data` fields appear in JSX: `data.stationId`, `data.status`, `data.temperatureCelsius`.

So out of four state variables, only **one** is rendered. The other three (`isFetching`, `intervalId`, `timeoutId`) exist purely for behavioral logic: guarding against concurrent requests, storing timer IDs for cleanup.

### Step 2: What happens every time one of those non-rendered values changes?

Each `setIsFetching`, `setIntervalId`, or `setTimeoutId` call triggers a re-render. But nothing in the JSX depends on them. The re-render produces the same output. It's wasted work.

Worse, look at the dependency arrays:

```tsx
const performFetch = useCallback(() => {
  // ...
}, [stationId, isFetching]);

const cleanup = useCallback(() => {
  // ...
}, [intervalId, timeoutId]);

useEffect(() => {
  // ...
}, [performFetch, data?.status, intervalId, cleanup]);
```

### Step 3: Can you trace the cascade?

Follow what happens when a single fetch completes:

1. `setIsFetching(false)` triggers a re-render
2. `isFetching` changed, so `performFetch` gets a new identity (its deps changed)
3. `performFetch` is in the main `useEffect`'s deps, so the effect re-runs
4. The effect's cleanup fires, which clears the interval
5. The effect body creates a new interval, calling `setIntervalId`
6. `setIntervalId` triggers another re-render
7. `intervalId` changed, so `cleanup` gets a new identity
8. `cleanup` is in the main `useEffect`'s deps, so the effect re-runs again

One fetch completion causes a chain reaction of re-renders and effect re-runs. The interval keeps getting torn down and recreated.

### Step 4: What if you convert the non-rendered values to refs?

The conversion is mechanical:

```
useState(x)    →  useRef(x)
setX(v)        →  xRef.current = v
x              →  xRef.current
```

Apply this to `isFetching`, `intervalId`, and `timeoutId`.

### Step 5: Trace the cascade again after converting

Now when a fetch completes:

1. `isFetchingRef.current = false` does NOT trigger a re-render
2. `performFetch`'s deps are now just `[stationId]`, so it stays stable
3. `cleanup`'s deps are now `[]` (it reads from refs), so it stays stable
4. The main `useEffect` doesn't re-run because none of its deps changed

The interval keeps running undisturbed. The only re-renders come from `setData`, which is the one value that actually matters for the UI.

### Step 6: Look at the dependency arrays after the fix

```tsx
const performFetch = useCallback(() => {
  // reads isFetchingRef.current — not a dep
}, [stationId]);

const cleanup = useCallback(() => {
  // reads intervalIdRef.current, timeoutIdRef.current — not deps
}, []);

useEffect(() => {
  // ...
}, [performFetch, data?.status, cleanup]);
```

Refs are read at call time, not captured at render time. That's why they don't belong in dependency arrays. The linter won't ask for them either.

### Verify

The component should still re-render when new weather data arrives (because `setData` fires). But it should NOT re-render on every fetch cycle just because `isFetching` toggled. The interval should stay stable and never get torn down and recreated mid-polling.

---

## Exercise B: DebouncedSearch

### Start by listing all the useState calls

There are six:

```tsx
const [inputValue, setInputValue] = useState("");
const [results, setResults] = useState<string[]>([]);
const [isSearching, setIsSearching] = useState(false);
const [currentSearchTerm, setCurrentSearchTerm] = useState("");
const [timerId, setTimerId] = useState<...>(null);
const [previousSearchTerm, setPreviousSearchTerm] = useState("");
const [searchCount, setSearchCount] = useState(0);
```

### Step 1: Which ones are rendered in JSX?

Go through the return statement line by line:

- `inputValue` — yes, it's the input's `value`
- `results` — yes, mapped into `<li>` elements
- `isSearching` — yes, controls the "Searching..." message
- `currentSearchTerm` — not directly, but it triggers the render that updates `previousSearchTerm`
- `timerId` — **no**. Only used in `handleSearch` to clear the previous timer and in the cleanup effect
- `previousSearchTerm` — yes, displayed in "Previous search: ..."
- `searchCount` — **no**. Only used in `console.log`

### Step 2: Start with the easy ones. What happens if `timerId` becomes a ref?

`timerId` is never rendered. It's only used to clear the previous timer. Convert it:

```tsx
const timerIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

Now look at the cleanup effect:

```tsx
useEffect(() => {
  return () => {
    if (timerId) {
      clearTimeout(timerId);
    }
  };
}, [timerId]);
```

With state, this effect had to re-run every time `timerId` changed (to capture the latest value in its closure). With a ref, the cleanup function reads `timerIdRef.current` at call time. The deps can be `[]`. The effect sets up once on mount and cleans up on unmount. Done.

### Step 3: What about `searchCount`?

`searchCount` is only used in a `console.log`. It never appears in JSX. Every `setSearchCount` call triggers a re-render that produces identical output.

Convert it to a ref. Instead of `setSearchCount(c => c + 1)`, write `searchCountRef.current += 1`. No re-render, same logging behavior.

### Step 4: Now the tricky one. What about `previousSearchTerm`?

This one IS displayed in JSX:

```tsx
{
  previousSearchTerm && <p>Previous search: &ldquo;{previousSearchTerm}&rdquo;</p>;
}
```

So it seems like it needs to be state. But ask: does it need to be the **trigger** for the render?

Look at what else happens at the same time. When a search completes, `setCurrentSearchTerm(term)` fires, which triggers a re-render. The render that shows the new results will also show the updated previous search term. So `currentSearchTerm` is already triggering the render that `previousSearchTerm` needs.

### Step 5: If you convert it to a ref, when do you update it?

The exercise code uses an effect:

```tsx
useEffect(() => {
  setPreviousSearchTerm(currentSearchTerm);
}, [currentSearchTerm]);
```

This runs _after_ the render triggered by `setCurrentSearchTerm`. That means it's always one cycle late. The "previous" value is actually the "current" value from the render that just finished.

With a ref, update it **synchronously** in the same callback, **before** calling `setCurrentSearchTerm`:

```tsx
previousSearchTermRef.current = currentSearchTerm; // capture "previous"
setCurrentSearchTerm(term); // trigger render
```

At this point, `currentSearchTerm` still holds the old value (the one that's about to become "previous"). Assigning it to the ref captures it at exactly the right moment. Then `setCurrentSearchTerm` triggers a re-render. During that render, `previousSearchTermRef.current` holds the correct previous value and `currentSearchTerm` holds the new one.

### Step 6: Why does updating the ref after `setCurrentSearchTerm` not work?

Because `setCurrentSearchTerm` doesn't mutate `currentSearchTerm` immediately. It schedules a re-render. So technically both orderings would capture the same value of `currentSearchTerm` within this callback. But the conceptual point stands: the ref should be updated synchronously in the same event, not in a separate effect that fires a render later.

The effect-based approach was broken because it ran after the render, causing a second render cycle. The ref approach eliminates that entirely.

### Verify

After converting `timerId`, `searchCount`, and `previousSearchTerm` to refs:

- Typing in the search box should still debounce and show results
- "Previous search" should display the correct previous term, not the current one
- The cleanup effect should have empty deps `[]`
- The `useEffect` that synced `previousSearchTerm` should be deleted entirely
- The component should re-render less often (no renders from timer ID changes or search count increments)

> **Warning**: reading a ref in JSX works here ONLY because a state change happens at the same time. If the ref changed on its own, the UI would NOT update. This is safe because `setCurrentSearchTerm` always fires alongside the ref update.

## Key reading

- [Referencing Values with Refs](https://react.dev/learn/referencing-values-with-refs)
