# Exercise 04: Way to get to the solution

The exercise only told you what the fixed version has to do, and `npm test` checks exactly that list. This is one way there, with the forks along the road where a different choice is just as good.

---

## Exercise A: WeatherStationPoller

### Step 1: What can make the display render at all?

`WeatherStationDisplay` gets one prop, `stationId`, and it never changes. So every render after the first one comes from a state update inside `useWeatherStationPoller`. There are four:

```tsx
const [data, setData] = useState<WeatherReading | null>(null);
const [isFetching, setIsFetching] = useState(false);
const [intervalId, setIntervalId] = useState<...>(null);
const [timeoutId, setTimeoutId] = useState<...>(null);
```

Only `data` leaves the hook, and only `data` shows up in JSX. The other three exist so the hook can remember things between renders: whether a request is in flight, and which timers to clear. Nothing on screen depends on them. Every `setIsFetching`, `setIntervalId` and `setTimeoutId` is a render that produces the same output as the one before.

### Step 2: Why six renders and two intervals per request, not three and none?

Three wasted state updates per cycle would already be bad. The counters say it's worse, and the reason is in the dependency arrays:

```tsx
const performFetch = useCallback(() => { ... }, [stationId, isFetching]);
const cleanup = useCallback(() => { ... }, [intervalId, timeoutId]);

useEffect(() => { ... }, [performFetch, isOffline, intervalId, cleanup]);
```

Follow one tick of the interval:

1. `performFetch` runs, `setIsFetching(true)` → render
2. `isFetching` changed, so `performFetch` is a new function
3. `performFetch` is a dependency of the main effect, so the effect re-runs: its cleanup clears the interval and calls `setIntervalId(null)` → render
4. `intervalId` changed, so `cleanup` is a new function, so the effect re-runs again, and this time it starts a new interval and calls `setIntervalId(id)` → render
5. The response arrives, `setData` and `setIsFetching(false)` → render
6. `isFetching` changed, so `performFetch` is new, so steps 3 and 4 happen all over again → two more renders

Six renders and two fresh intervals, for one reading. The interval you asked for once a second is torn down and rebuilt twice a second. It only keeps polling at all because the rebuilds happen to land before the next tick. The console even shows `interval cleared` twice per teardown: two consecutive runs of the effect captured the same interval id, and the cleanup of each one clears it.

Note what the cascade is made of. State updates cause renders, renders give callbacks new identities, new identities re-run effects, effects cause state updates. Every link is a value that was never meant to be rendered.

### Step 3: What does a ref change?

A ref is a box that React hands you once and never looks into again. Writing to it doesn't render. Reading it gives you the current contents at the moment you read, not the contents from the render the reading function was created in. That second half is what breaks the chain: a function that reads `isFetchingRef.current` doesn't have to be recreated when the flag changes, so `isFetching` disappears from its dependency array, so the effect that depends on the function stops re-running.

The conversion itself is mechanical:

```
useState(x)      →  useRef(x)
x                →  xRef.current
setX(value)      →  xRef.current = value
```

Apply it to `isFetching`, `intervalId` and `timeoutId`, then go back over the dependency arrays and take out what the linter no longer asks for:

```tsx
const performFetch = useCallback(() => { ... }, [stationId]);
const cleanup = useCallback(() => { ... }, []);
useEffect(() => { ... }, [performFetch, isOffline, cleanup]);
```

Trace the same tick again. `isFetchingRef.current = true`: no render. Response: `setData` → one render. `performFetch` and `cleanup` keep their identity, the effect doesn't re-run, the interval keeps ticking.

### Step 4: The `if (!intervalId)` guard

The original effect only starts an interval if there isn't one. With `intervalId` in state that guard was load-bearing, because the effect re-ran constantly and had to avoid stacking intervals. Now the effect runs on mount and once more when `isOffline` flips, and the cleanup of the previous run has already cleared the interval each time. The guard can go. If you keep it, it costs nothing, but it hides the fact that the effect is now well-behaved.

### Another road: no refs at all

Everything the refs hold is only ever touched by the polling effect and the callbacks it calls. So you can also move the whole thing into one effect and keep the bookkeeping in plain variables:

```tsx
useEffect(() => {
  if (!stationId || isOffline) return;

  let inFlight = false;
  let retryId: ReturnType<typeof setTimeout> | null = null;

  const poll = () => {
    if (inFlight) return;
    inFlight = true;
    fetchWeatherReading(stationId)
      .then((result) => {
        setData(result);
        inFlight = false;
      })
      .catch(() => {
        inFlight = false;
        retryId = setTimeout(poll, 1000);
      });
  };

  const intervalId = startPollingInterval(poll, 1000);
  return () => {
    stopPollingInterval(intervalId);
    if (retryId) clearTimeout(retryId);
  };
}, [stationId, isOffline]);
```

That passes every check in the exercise, and it is arguably the cleaner hook. `let inFlight` inside an effect is a ref in every way that matters: mutable, per instance, invisible to React. The only difference is lifetime. A closure variable lives as long as one run of the effect. A ref lives as long as the component. Reach for the ref when something outside the effect has to see the value: another effect, an event handler, or the next run of the same effect. In the exercise the visibility handler wants to call `performFetch` and respect the in-flight flag, which is exactly that situation. Move the visibility listener into the same effect and the need goes away again. Either shape is fine; what isn't fine is `useState` for a value the screen never sees.

### Verify

Reload and watch. `renders` should read 1 while waiting, then climb by one per request. `intervals started` stays at 1. The console shows one `interval #1 started` and nothing else until you click "Take station offline", at which point the next reading says OFFLINE, the console shows `interval cleared`, and `requests sent` stops moving.

To see a retry, watch the console for `Network error`: `requests sent` goes up again about a second later, and `renders` does not, because a failed request never calls `setData`.

---

## Exercise B: DebouncedSearch

### Step 1: Sort the state

Two questions for each `useState`. Does the UI show it? Does the component have to remember it between renders?

| Variable             | Shown?                    | Remembered?                      |
| -------------------- | ------------------------- | -------------------------------- |
| `inputValue`         | yes, the input's value    |                                  |
| `results`            | yes                       |                                  |
| `isSearching`        | yes                       |                                  |
| `previousSearchTerm` | yes                       |                                  |
| `currentSearchTerm`  | no                        | yes, the next "previous" term    |
| `timerId`            | no                        | yes, to cancel the pending timer |
| `searchCount`        | no, it only goes to a log | yes                              |

The first four are state. The last three are remembered but never shown, so they are refs. That's the mechanical part: `timerIdRef`, `searchCountRef`, and the cleanup effect's dependency array becomes `[]` because the cleanup reads the ref when it runs.

### Step 2: Why is "Previous search" wrong?

```tsx
useEffect(() => {
  setPreviousSearchTerm(currentSearchTerm);
}, [currentSearchTerm]);
```

The effect runs after the render in which `currentSearchTerm` already holds the new term. So it copies the new term into `previousSearchTerm`. It never had access to the old one: by the time an effect runs, the snapshot it lives in has moved on. That is the same one-render-late mechanism as the state-syncing effects in exercises 02 and 03, only here it doesn't just cost a render, it produces the wrong value.

### Step 3: Where is the previous term at the moment you need it?

You need it exactly once: when a search completes, right before you record the new term. At that moment the previous term is whatever the last completed search was. So remember that in a ref, and set the state from it:

```tsx
setPreviousSearchTerm(lastSearchedTermRef.current);
lastSearchedTermRef.current = term;
```

`previousSearchTerm` stays state, because it is shown. The effect is gone, and with it the extra render.

Two other shapes do the same job. You can keep both terms in one piece of state and derive the new pair from the old one:

```tsx
const [search, setSearch] = useState({ previous: "", current: "" });
setSearch((s) => ({ previous: s.current, current: term }));
```

This bends the "not shown, so not state" rule a little, since `current` never renders. It is still fine: it changes together with `previous`, the update is batched into the same render, and the functional update guarantees you read the latest value. Pick whichever reads better to you.

### Step 4: The tempting one that isn't

The shape to avoid is making `previousSearchTerm` a ref and reading it in JSX:

```tsx
previousSearchTermRef.current = currentSearchTerm; // ← from this callback's closure
setCurrentSearchTerm(term);
// ...
{
  previousSearchTermRef.current && <p>Previous search: ...</p>;
}
```

It appears to work, and you will find it in real code. It works only because `setCurrentSearchTerm` happens to trigger a render at the same time; if the ref ever changed on its own, the screen would not follow. React's rule is not to read refs during render for exactly that reason. And there's a second, quieter problem: `currentSearchTerm` here comes from the closure of the keystroke render, which is whatever was current when the user typed, not when the search completed. Type while a search is still in flight and the "previous" term is stale. The ref version in step 3 doesn't have that problem, because it reads the ref at completion time.

### Verify

Type "re", wait, type "act". The results are for "react" and the line above them says the previous search was "re". Watch the counter on a single search: one tick for the keystroke, one for "Searching...", one for the results. Before the fix there was a fourth, and one more stray render somewhere before the first search: the effect ran on mount, set `previousSearchTerm` to the value it already had, and React still had to run the component once to find that out.

Type something and click "Hide search" within 300ms. No `Search #n` line appears in the console.

---

## Side notes

### Why doesn't the counter move for `timerId` and `searchCount`?

Because both are set in the same tick as an update that does render: `setTimerId` next to `setInputValue`, `setSearchCount` next to `setIsSearching`. React batches them, so there's no extra render to count. The cost of keeping them in state isn't visible here.

Which is a fair question: then why move them? Two reasons. Intent: a reader of `useState` assumes the screen depends on the value, and it doesn't. And fragility: `handleSearch` only finds the right `timerId` because it is recreated on every render. Wrap it in `useCallback`, as someone will eventually do, and it captures `timerId` as `null` forever, so the debounce stops debouncing. A ref is read at call time and survives that refactor untouched. Exercise A is the same story with the fragility already showing.

### Would React Compiler fix Exercise A?

No. The compiler memoizes: it would write the `useCallback`s for you. It doesn't change what they depend on, and `performFetch` genuinely depends on `isFetching` as long as `isFetching` is state. The renders come from `setState` calls, and no amount of memoization cancels a render that was asked for. Moving a value from state to a ref is a change to what the component considers renderable, and that is a decision only you can make.

## Key reading

- [Referencing Values with Refs](https://react.dev/learn/referencing-values-with-refs)
- [Synchronizing with Effects — each render has its own effects](https://react.dev/learn/synchronizing-with-effects#each-render-has-its-own-effects)
