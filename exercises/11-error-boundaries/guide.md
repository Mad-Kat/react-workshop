# Exercise 11: Way to get to the solution

## Part 1: Isolate failures

### Start by toggling "Product fails" in the exercise

Check the "Product fails" checkbox. What happens?

The whole page crashes. Not just the product section. The reviews, the recommendations, the failure toggles themselves. Everything is gone, replaced by a React error screen.

### Step 1: Why does the whole page crash?

When `ProductInfo` throws during rendering, the error propagates up the component tree looking for something to catch it. There's nothing. No boundary wraps `ProductInfo`, and no boundary wraps the page. The error reaches the root and React unmounts the entire application.

One broken section takes down the entire UI.

### Step 2: How do you isolate the failure?

Wrap each section in its own `ErrorBoundary`. Read the ErrorBoundary class in the exercise file. The `fallback` prop accepts two forms:

- **A ReactNode** (static fallback): `fallback={<p>Something went wrong</p>}`
- **A function** (dynamic fallback): `fallback={({ error, retry }) => <div>...</div>}`

The function form gives you access to the error message and a `retry` function that resets the boundary's error state, causing the children to re-render.

### Step 3: What fallback makes sense for each section?

Before writing code, think about criticality. Not all sections are equally important:

- **ProductInfo** is the core of the page. Without it, the page is useless. Show a full error message with the error text and a retry button.
- **ReviewsSection** is useful but not essential. Show an "unavailable" message with a retry button.
- **RecommendationsSection** is purely additive. If it fails, the user won't miss it. Return `null` to silently hide the section.

```tsx
<ErrorBoundary
  fallback={({ error, retry }) => (
    <div>
      <p>{error.message}</p>
      <button onClick={retry}>Retry</button>
    </div>
  )}
>
  <ProductInfo />
</ErrorBoundary>
```

One boundary per section means **fault isolation**. Reviews crashing doesn't affect product info. Recommendations crashing doesn't affect reviews.

### Step 4: Verify

Toggle each section's failure independently. Check that:

- One section failing doesn't affect the others
- The error fallback matches the section's criticality
- Clicking Retry works: uncheck the toggle (to "fix the bug"), then click Retry. The section should reappear.
- Clicking Retry _without_ unchecking the toggle re-throws immediately. That's correct. The underlying condition hasn't changed.

---

## Part 2: Discover what boundaries DON'T catch

### Step 5: Uncomment BrokenButton. Wrap it in an ErrorBoundary. Click it.

The boundary does **not** catch the error. The button's `onClick` handler throws, but the boundary is silent.

### Step 6: Why doesn't it work?

Error boundaries only catch errors during **rendering**, which is the component's return statement and JSX evaluation. An `onClick` handler runs **after** rendering, outside React's render phase. By the time the handler throws, React is done rendering. There's no boundary mechanism active.

What boundaries don't catch:

- **Event handlers**: use `try/catch` in the handler
- **Async code** (Promises, setTimeout): handle in `.catch()` or `try/catch`
- **SSR errors**: server errors crash the whole render
- **Errors in the boundary itself**: use a parent boundary

If you need to surface an event handler error in a boundary, the handler can call a state setter that causes the next render to throw. But that's a workaround, not the intended use of boundaries.

---

## Key reading

- [Catching rendering errors with an error boundary](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
