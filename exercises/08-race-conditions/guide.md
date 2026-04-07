# Exercise 08: Way to get to the solution

## Exercise A: Ignore flag approach

### Start by implementing it naively

Write the simplest possible version: a `useEffect` that calls `searchProducts(query)`, awaits the result, and calls `setResults`. No cleanup, no guard. Just the fetch.

```tsx
useEffect(() => {
  searchProducts(query).then(data => {
    setResults(data);
    setIsLoading(false);
  });
  setIsLoading(true);
}, [query]);
```

Don't forget to handle the empty query case. If `query` is empty, set results to `[]`, set `isLoading` to false, and return early before fetching.

### Step 1: Type "shoes" quickly. What do you see?

The results flicker. You type "s", "sh", "sho", "shoe", "shoes" and the list jumps between results for different prefixes. Sometimes the final result says "sho sneakers" even though the input says "shoes".

That's the bug. But why?

### Step 2: Trace the lifecycle when query changes from "sh" to "sho"

Here's what happens in order:

1. React runs the **cleanup** from the `"sh"` effect (there is none yet)
2. React runs the **new** effect for `"sho"`, which fires a fetch
3. But the fetch for `"sh"` is still in flight. Its `.then()` callback will fire whenever the response arrives.

The API has random latency (50 to 500ms). So the `"sh"` response might arrive *after* the `"sho"` response. When it does, its `.then()` calls `setResults` with stale data. The newer result gets overwritten by an older one.

### Step 3: How do you tell the old callback "you're stale, don't update state"?

Each effect invocation needs a way to know whether it's still current. When React cleans up an effect (because `query` changed), the old callback should stop itself from writing to state.

A local `let ignore = false` variable does the job. The cleanup sets it to `true`. The `.then()` checks it before calling `setResults`:

```tsx
useEffect(() => {
  let ignore = false;

  fetchData(query).then(data => {
    if (!ignore) setResults(data);  // only update if still current
  });

  return () => { ignore = true; };  // mark this effect as stale
}, [query]);
```

### Step 4: Why does this actually work?

Each effect invocation creates its own `ignore` variable via **closure** (Exercise 01). The cleanup sets *that specific* `ignore` to true, so the corresponding `.then()` checks *its own* `ignore`. They don't share a single flag; each render cycle has its own.

### Step 5: Verify

Type "shoes" quickly. The results should no longer flicker. Only the final result for "shoes" appears. The `isLoading` state should also be correct: loading while the current query is in flight, not loading when it resolves.

---

## Exercise B: AbortController approach

### Step 1: What if you could cancel the request entirely?

The ignore flag works, but the old request still completes. The server still does the work, the bytes still travel over the network, and the browser still parses the response. You just throw it away.

`AbortController` actually cancels the in flight request:

```tsx
useEffect(() => {
  const controller = new AbortController();

  fetchData(query, controller.signal)
    .then(data => setResults(data))
    .catch(err => {
      if (err.name === "AbortError") return;  // expected, not a bug
    });

  return () => controller.abort();  // actually cancel the request
}, [query]);
```

### Step 2: Why do you need the catch?

When you call `controller.abort()`, the promise rejects with a `DOMException` named `"AbortError"`. That's not a bug. That's the expected signal that cancellation worked. You need to catch it and ignore it. Any other error is a real problem and should be handled normally.

### Step 3: When would you pick one over the other?

| | Ignore flag | AbortController |
|---|---|---|
| Complexity | Simple | More code (error handling) |
| Network | Request completes, result discarded | Request cancelled (saves bandwidth) |
| API support | Works with any Promise | Needs signal support |
| When to use | Most cases | Real HTTP requests in production |

### Edge case: empty query

Both approaches need the same early return for empty queries. Return `[]` without fetching, and reset `isLoading` to false.

---

## Key reading

- [Fetching data with Effects](https://react.dev/learn/synchronizing-with-effects#fetching-data)
