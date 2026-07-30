# Exercise 10: Way to get to the solution

## Exercise A: Study the manual version first

### Start by reading ProductPageManual top to bottom

You see six `useState` calls, two fetch chains in a `useState` initializer (an anti-pattern used here for brevity), and a render method full of ternary chains: loading? error? data? null?

### Step 1: Count the state variables

Six. Two for data (`product`, `reviews`), two for loading flags (`productLoading`, `reviewsLoading`), two for error states (`productError`, `reviewsError`). Every async data source needs three state variables just to model its lifecycle.

If you added a third data source (say, related products), you'd add three more `useState` calls. This doesn't scale.

### Step 2: What if React could manage the loading and error states for you?

That's what Suspense does. Instead of you tracking `isLoading` and `error` per data source, you tell React: "this subtree is waiting for something; show a fallback until it's ready." The component itself just reads data, as if it were already available.

But where do the promises go?

### Verify

Before moving on: you should be able to say why the manual version needs three state variables *per data source*, and what would happen if a third source were added.

---

## Exercise B: Convert to Suspense + use()

### Step 1: Try putting the promise inside the component

Your first instinct might be:

```tsx
function ProductInfo() {
  const productPromise = fetchProduct(); // NEW promise every render!
  const product = use(productPromise);   // suspends → React re-renders → new promise → ...
}
```

Think about what happens. `use()` sees a pending promise and suspends (throws). React shows the Suspense fallback. When it tries to re-render the component, the function body runs again. `fetchProduct()` creates a *new* promise. `use()` sees *another* pending promise and suspends again. This loops forever: render, new promise, suspend, render, new promise, suspend...

### Step 2: So where should the promise live?

Outside the component. Create it at module scope so it's created once and reused across renders:

```tsx
const productPromise = fetchProduct();  // created once, reused across renders
```

This is exactly what frameworks like Relay do. The network request is kicked off when the route loads, and the same promise reference is reused on every render.

### Step 3: How does use() work?

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

### Step 4: How do you compose independent loading states?

Wrap each data consumer in its own `<Suspense>` boundary. Separate boundaries mean independent loading. Product appears at 800ms without waiting for reviews (1500ms). The user sees content progressively:

```tsx
<Suspense fallback={<div>Loading product...</div>}>
  <ProductInfo />
</Suspense>

<Suspense fallback={<div>Loading reviews...</div>}>
  <ReviewsList />
</Suspense>
```

If you wrapped both in a single `<Suspense>`, the entire fallback would show until *both* promises resolve. Two boundaries give you progressive disclosure.

### Step 5: Where does the ErrorBoundary go?

Outside the Suspense boundary:

```tsx
<ErrorBoundary fallback={<p>Failed to load</p>}>  {/* catches rejected promises */}
  <Suspense fallback={<p>Loading...</p>}>           {/* catches pending promises */}
    <ProductInfo />
  </Suspense>
</ErrorBoundary>
```

If the promise rejects, `use()` re-throws the error. The ErrorBoundary **above** the Suspense boundary catches it. If the ErrorBoundary were inside, it would be hidden by the Suspense fallback while the promise is pending and would never get a chance to render when the error occurs.

### Verify

The result: 6 state variables become 0. The manual version needed `useState` for product, reviews, productLoading, reviewsLoading, productError, reviewsError. The Suspense version needs **zero** state for loading and error management. React handles it all.

Product should appear first (800ms), reviews should appear later (1500ms), and uncommenting the `throw` in `fetchReviews` should show the error fallback for reviews without affecting the product section.

---

## Beyond the exercise: what about refetching?

The exercise creates promises at module scope, so the data loads once. In a real app, you refetch when the user navigates, applies a filter, or pulls to refresh. That raises a question: should the user see the loading fallback again every time?

### The problem with naive refetching

If you create a new promise and Suspense catches it, the entire content disappears and the fallback shows again. The user was looking at a product page, clicked a filter, and now sees "Loading..." for 800ms. That feels broken. They already had content on screen.

### The fix: useTransition

Wrap the refetch in `startTransition`. React keeps the old content visible while the new data loads in the background:

```tsx
const [isPending, startTransition] = useTransition();

const handleFilterChange = (newFilter) => {
  startTransition(() => {
    // create new promise / trigger refetch
    setProductPromise(fetchProduct(newFilter));
  });
};
```

During the transition:
- The old content stays on screen (no fallback flash)
- `isPending` is `true`, so you can show a subtle loading indicator (spinner, opacity change)
- If the user changes the filter again before the fetch resolves, React abandons the stale render

Without `startTransition`, Suspense always shows the fallback for pending promises. With it, Suspense only shows the fallback on the *initial* load (when there's no old content to keep visible). This is the pattern Relay uses with `useTransition` + `refetch`.

### How this connects to Exercise 09

Exercise 09 introduced `useTransition` for form mutations (keeping the old UI while the action runs). The same primitive works here: keep the old UI while new data loads. Transitions are React's general tool for "don't drop the current content just because something new is pending."

---

## Key reading

- [use()](https://react.dev/reference/react/use)
- [Suspense](https://react.dev/reference/react/Suspense)
