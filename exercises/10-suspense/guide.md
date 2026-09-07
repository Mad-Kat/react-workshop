# Exercise 10: Way to get to the solution

## Part 1: Study the manual version first

### Start by reading ProductPageManual top to bottom

You see six `useState` calls, two fetch chains in a `useState` initializer (an anti-pattern used here for brevity), and a render method full of ternary chains: loading? error? data? null?

### Step 1: Count the state variables

Six. Two for data (`product`, `reviews`), two for loading flags (`productLoading`, `reviewsLoading`), two for error states (`productError`, `reviewsError`). Every async data source needs three state variables just to model its lifecycle.

If you added a third data source (say, related products), you'd add three more `useState` calls. This doesn't scale.

### Step 2: What if React could manage the loading and error states for you?

That's what Suspense does. Instead of you tracking `isLoading` and `error` per data source, you tell React: "this subtree is waiting for something; show a fallback until it's ready." The component itself just reads data, as if it were already available.

But where do the promises go?

### Step 3: Try putting the promise inside the component

Your first instinct might be:

```tsx
function ProductInfo() {
  const productPromise = fetchProduct(); // NEW promise every render!
  const product = use(productPromise); // suspends → React re-renders → new promise → ...
}
```

Think about what happens. `use()` sees a pending promise and suspends (throws). React shows the Suspense fallback. When it tries to re-render the component, the function body runs again. `fetchProduct()` creates a _new_ promise. `use()` sees _another_ pending promise and suspends again. This loops forever: render, new promise, suspend, render, new promise, suspend...

### Step 4: So where should the promise live?

Outside the component. Create it at module scope so it's created once and reused across renders:

```tsx
const productPromise = fetchProduct(); // created once, reused across renders
```

This is exactly what frameworks like Relay do. The network request is kicked off when the route loads, and the same promise reference is reused on every render.

### Step 5: How does use() work?

`use()` has three behaviors depending on the promise state:

- **Pending**: throws the promise. The nearest `<Suspense>` boundary catches it and shows its fallback.
- **Rejected**: throws the error. The nearest `ErrorBoundary` catches it.
- **Resolved**: returns the value. The component renders normally.

Your component just reads data. No `loading`, `error`, or `data` state needed:

```tsx
function ProductInfo() {
  const product = use(productPromise);
  return <div>{product.name}</div>;
}
```

### Step 6: How do you compose independent loading states?

Wrap each data consumer in its own `<Suspense>` boundary. Separate boundaries mean independent loading. Product appears at 800ms without waiting for reviews (1500ms). The user sees content progressively:

```tsx
<Suspense fallback={<div>Loading product...</div>}>
  <ProductInfo />
</Suspense>

<Suspense fallback={<div>Loading reviews...</div>}>
  <ReviewsList />
</Suspense>
```

If you wrapped both in a single `<Suspense>`, the entire fallback would show until _both_ promises resolve. Two boundaries give you progressive disclosure.

### Step 7: Where does the ErrorBoundary go?

Outside the Suspense boundary:

```tsx
<ErrorBoundary fallback={<p>Failed to load</p>}>
  {" "}
  {/* catches rejected promises */}
  <Suspense fallback={<p>Loading...</p>}>
    {" "}
    {/* catches pending promises */}
    <ProductInfo />
  </Suspense>
</ErrorBoundary>
```

If the promise rejects, `use()` re-throws the error. The ErrorBoundary **above** the Suspense boundary catches it. If the ErrorBoundary were inside, it would be hidden by the Suspense fallback while the promise is pending and would never get a chance to render when the error occurs.

### Verify

The result: 6 state variables become 0. The manual version needed `useState` for product, reviews, productLoading, reviewsLoading, productError, reviewsError. The Suspense version needs **zero** state for loading and error management. React handles it all.

Product should appear first (800ms), reviews should appear later (1500ms), and uncommenting the `throw` in `fetchReviews` should show the error fallback for reviews without affecting the product section.

---

## Side note: `<Activity>`

Stable since React 19.2, and the question it answers is easy to confuse with Suspense.

**Suspense is about data that isn't ready yet.** A subtree wants to render, can't, so React shows a fallback until it can. Everything in this exercise is that.

**Activity is about a subtree you're deliberately not showing right now.** A tab the user hasn't opened, the page they're about to navigate to, a panel they just closed.

```tsx
<Activity mode={tab === "reviews" ? "visible" : "hidden"}>
  <Reviews />
</Activity>
```

Hidden means React keeps the component's state, unmounts its effects, and renders updates to it at a lower priority than anything visible. Compare that to the two things you'd otherwise reach for:

- `{tab === "reviews" && <Reviews />}` unmounts the subtree. State is gone, effects are torn down, and reopening the tab re-fetches from scratch.
- `<div style={{ display: "none" }}>` keeps the state _and_ keeps the effects running — subscriptions stay open, timers keep firing, for a subtree nobody can see.

Activity is the middle option, and it's the one that's usually meant.

Where it meets this exercise: a hidden Activity still renders, so a `use()` inside one starts its fetch and warms the Suspense boundary before the user ever switches tabs. The work happens at low priority, so it yields to whatever is on screen. That's the pre-rendering case — you get an instant tab switch without hand-rolling a prefetch.

Worth knowing that hidden effects being unmounted is the sharp edge. If a component's effect is doing something that must keep running while hidden, Activity is the wrong tool for it.

## Key reading

- [use()](https://react.dev/reference/react/use)
- [Suspense](https://react.dev/reference/react/Suspense)
- [`<Activity>`](https://react.dev/reference/react/Activity)
