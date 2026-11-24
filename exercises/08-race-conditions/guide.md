# Exercise 08: Way to get to the solution

The exercise only told you what the fixed version has to do, and `npm test` checks exactly that list. This is one way there, with the forks along the road where a different choice is just as good.

---

## Exercise A: Product Search

### Step 1: Follow the searches

Type "shoes" with about 100ms between keystrokes. Every keystroke changes `query`, every change runs the effect, and every run starts a search. `api.ts` decides how long each one takes:

| Typed at | Query   | Takes  | Answered at |
| -------- | ------- | ------ | ----------- |
| 0ms      | "s"     | 2000ms | 2000ms      |
| 100ms    | "sh"    | 1000ms | 1100ms      |
| 200ms    | "sho"   | 300ms  | 500ms       |
| 300ms    | "shoe"  | 300ms  | 600ms       |
| 400ms    | "shoes" | 300ms  | 700ms       |

Now sort the last column. The answers arrive as "sho", "shoe", "shoes", "sh", "s", and each one calls `setResults`. Whatever arrives last wins, and here that's the oldest, shortest query. The input says "shoes" and the list says "s".

"Searching..." is wrong too. The answer for "sho" arrives at 500ms and calls `setIsLoading(false)`, while the search for "shoes" is still 200ms away.

The made-up latencies only make the order reliable. A real network will reorder responses too, just not every time, which is why this bug survives code review and shows up in production.

### Step 2: The tempting fix

Debounce the search: wait until the user has stopped typing for 300ms, then search. Fewer searches, and with quick typing only "shoes" goes out at all.

It makes the race rarer, but it doesn't remove it. Type "s", pause for half a second, then type "hoes". Two searches go out, the one for "s" is still the slow one, and it still lands last. Debouncing decides _how many_ searches start. It says nothing about which answer is allowed to land. You may well want a debounce in a real search box anyway, to spare the server, but it's not the fix for this bug.

### Step 3: Who knows that an answer is stale?

React does. Before it runs the effect for the new `query`, it runs the cleanup function returned by the previous run. And when the component goes away, it runs the cleanup one last time. That's exactly the moment a search stops being wanted.

So let the cleanup leave a note that the `.then` can read:

```tsx
useEffect(() => {
  if (!query) {
    setResults([]);
    setIsLoading(false);
    return;
  }

  let ignore = false;
  setIsLoading(true);
  searchProducts(query).then((data) => {
    if (!ignore) {
      setResults(data);
      setIsLoading(false);
    }
  });

  return () => {
    ignore = true;
  };
}, [query]);
```

Back to the table. At 100ms the effect for "sh" is about to run, so React first runs the cleanup of the "s" run, and that run's `ignore` is now `true`. The same happens to "sh", "sho" and "shoe". When their answers come in, they find their flag set and do nothing. Only "shoes" gets to write.

### Step 4: Why does each search see its own flag?

`let ignore` is declared inside the effect, so every run of the effect gets a new variable. The `.then` callback and the cleanup function were created in the same run, so they close over the same one (Exercise 01). The cleanup of the "s" run sets the "s" run's `ignore`, and nothing else's. There's no shared "latest" anywhere: each search carries its own answer to the question "am I still wanted?".

### Step 5: Why skip `setIsLoading(false)` as well?

Because the stale answer doesn't get to say anything about loading either. When the answer for "sho" arrives, the run for "shoes" has already set `isLoading` to `true`, and it will set it back to `false` when _its_ answer arrives. If the stale answer switched it off, "Searching..." would disappear while the results for what's in the box are still on their way.

The empty box works the same way. Empty it while "s" is running, and the cleanup of the "s" run sets its flag. The new run shows no results and no "Searching...", and when the answer for "s" arrives, it does nothing.

### Another road: derive the loading state

`isLoading` only tells you whether the results on screen are for what's in the box. So you can keep the query along with the results and compute the rest during render (Exercise 02):

```tsx
const [response, setResponse] = useState<{ query: string; results: SearchResult[] } | null>(null);

useEffect(() => {
  if (!query) return;

  let ignore = false;
  searchProducts(query).then((results) => {
    if (!ignore) setResponse({ query, results });
  });
  return () => {
    ignore = true;
  };
}, [query]);

return {
  results: query ? (response?.results ?? []) : [],
  isLoading: query !== "" && response?.query !== query,
};
```

There's no `setIsLoading` left to forget, and the empty box needs no state update at all. It passes the same tests. Note that it still needs the ignore flag: without it, the stale answer for "s" would overwrite `response`, and `isLoading` would correctly say `true` while the list showed the wrong results.

### Another road: a request counter in a ref

A common pattern: a ref counts the searches, each search remembers its number, and an answer is only used if its number is still the latest. It works, and it's what you need when the search is started from an event handler, where there's no cleanup to lean on (a "Search" button rather than search-as-you-type). Inside an effect, the cleanup already tells you when an answer is stale, so the counter rebuilds something React gives you for free.

### Verify

Type "shoes" quickly. The results for "shoes" show up and stay. Empty the box while a search is running: the list stays empty. The counters still say every search was answered: the stale ones are ignored, not stopped. That's Exercise B.

---

## Exercise B: Cancellable Product Search

### Step 1: What ignoring doesn't do

Type "shoes" in A and look at the counters: 5 searches sent, 5 answered. The search for "s" still keeps the server busy for 2 seconds, and its answer still travels back, only to be thrown away. The ignore flag stops the answer from reaching the screen. It doesn't stop the work.

### Step 2: Cancel instead of ignore

`AbortController` is the browser's standard way to cancel async work. The controller has a `signal` you hand to whoever does the work, and `abort()` tells them to stop. `fetch()` takes a `signal`, and so does `searchProducts`. The cleanup runs at the same moment as before. It just does something stronger:

```tsx
useEffect(() => {
  if (!query) {
    setResults([]);
    setIsLoading(false);
    return;
  }

  const controller = new AbortController();
  setIsLoading(true);
  searchProducts(query, controller.signal)
    .then((data) => {
      setResults(data);
      setIsLoading(false);
    })
    .catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      throw error;
    });

  return () => controller.abort();
}, [query]);
```

No `ignore` flag: an aborted search never resolves, so the `.then` only ever runs for the search that is still current.

### Step 3: Why the `.catch`?

An aborted search doesn't just stop, it rejects, with a `DOMException` named `"AbortError"`. That's what `fetch()` does too. Without a `.catch`, every keystroke would log an unhandled rejection.

But only the abort is expected. Catch that one and let everything else through. A `.catch(() => {})` would hide real failures as well, and a search that fails for real would leave "Searching..." on screen forever without a trace in the console. Handling real failures properly (an error message, a retry) is a different job, and Exercise 11 is about where that job belongs.

### Step 4: Does abort replace the flag everywhere?

Here, yes. In general, only if everything between the request and `setResults` listens to the signal. `fetch()` does, and so does `response.json()`. But if you `await` something after the response that can't be cancelled, an aborted search can still get past it. Then keep the ignore flag as well. The two combine fine: abort to stop the work, the flag as the last word on whether the answer may land.

### Ignore flag or AbortController?

|             | Ignore flag                             | AbortController                         |
| ----------- | --------------------------------------- | --------------------------------------- |
| Code        | A variable and a check                  | A controller, a signal, a `.catch`      |
| The search  | Runs to the end, the answer is dropped  | Is stopped, the server can stop as well |
| API support | Works with any promise                  | The API has to accept a signal          |
| When to use | Anything you can't cancel, or don't own | Real requests: `fetch` takes a signal   |

### Verify

Reset the counters and type "shoes" quickly: 5 sent, 1 answered, 4 aborted. Type "s" and click "Hide search" before the results arrive: 1 sent, 0 answered, 1 aborted. The cleanup runs on unmount too.

---

## Where this goes next

You rarely write this effect by hand in the codebase, because Relay does it for you: `refetch()` returns a `Disposable`, and starting a new refetch disposes the previous one. Exercise 10 takes the other road: with `use()` and Suspense, the component doesn't keep loading state at all, and the question becomes which promise it reads, not which answer is allowed to land.

## Key reading

- [Fetching data with Effects](https://react.dev/learn/synchronizing-with-effects#fetching-data)
- [You Might Not Need an Effect — fetching data](https://react.dev/learn/you-might-not-need-an-effect#fetching-data)
- [AbortController (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
