# Exercise 09: Way to get to the solution

## Exercise A: Study the manual version first

### Start by reading TodoListManual top to bottom

You see five `useState` calls, a `handleSubmit` with `e.preventDefault()`, a try/catch/finally block, and manual cleanup in every branch. It works. But look at how much code exists purely to manage the async lifecycle.

### Step 1: Count the useState calls for async state

Three of the five `useState` calls have nothing to do with the domain (todos and input value). They exist only because you're doing something async:

- `isPending` tracks whether the API call is in flight
- `error` tracks whether the API call failed
- `optimisticTodo` shows the item before the server confirms it

And then look at the cleanup. `setOptimisticTodo(null)` appears in both the success path and the error path. `setIsPending(false)` lives in `finally`. `setInputValue(text)` restores the input on failure. That's a lot of ceremony for "add an item to a list."

### Verify

Before moving on, you should be able to point at the three pieces of async-lifecycle ceremony in `TodoListManual`: the pending flag, the error state, and the two-path optimistic cleanup. Exercise B removes all three.

---

## Exercise B: Refactor to actions

### Step 1: What if you could eliminate isPending?

That's what `useTransition` does:

```tsx
const [isPending, startTransition] = useTransition();
```

Wrap the async work in `startTransition(async () => { ... })`. React tracks pending state for you. No `setIsPending(true)` at the top, no `finally { setIsPending(false) }` at the bottom. One hook replaces three lines of boilerplate and the risk of forgetting the `finally`.

### Step 2: Ok, but what about the optimistic item?

The manual version creates a fake todo with `id: "optimistic"`, adds it to the display list, then removes it on success or failure. Two cleanup paths.

`useOptimistic` handles this automatically:

```tsx
const [optimisticTodos, addOptimisticTodo] = useOptimistic(
  todos,
  (state, newTodo: Todo) => [...state, newTodo]
);
```

Call `addOptimisticTodo(newItem)` inside the transition. The optimistic value is visible immediately. When the transition ends (success or failure), it **automatically reverts** to the real `todos` state. No manual `setOptimisticTodo(null)`.

The revert happens because the transition ends, not because an exception propagates. If the action succeeds and updates `todos`, the optimistic item is replaced by the real item. If the action fails without updating `todos`, the optimistic item disappears.

### Step 3: What about the form ceremony?

The manual version has `e.preventDefault()`, a controlled input with `onChange`, and manual clearing of the input after submission. What if the form could handle its own lifecycle?

```tsx
<form action={async (formData) => { ... }}>
```

When the `action` prop is a function, React does several things for you:

- Calls the action inside a transition automatically
- Provides input values via `formData.get("text")` (no controlled state needed)
- Resets the form after the action completes
- Skips the default navigation behavior (no `e.preventDefault()` required)

**Bonus:** extract a `SubmitButton` that uses `useFormStatus()` from `react-dom` to read pending state without prop drilling.

### Verify

The action version should behave identically to the manual version: optimistic item appears instantly at half opacity, disappears on error, gets replaced by the real item on success. But count the `useState` calls now. The async lifecycle state is gone.

---

## Exercise C: useActionState for sequential mutations

### Start by clicking "Like" three times quickly in the manual version

Watch the count. You clicked three times, but the count only went from 42 to 43. Not 45. Why?

### Step 1: Trace what happens on rapid clicks

Each click calls `handleLike`, which reads `likeCount` from the closure. All three clicks read the same snapshot: `42`. All three calls to `fakeLikeApi(42)` return `43`. The last one to resolve writes `43` to state. Two clicks are effectively lost.

### Step 2: What if each click could see the result of the previous one?

That's what `useActionState` provides:

```tsx
const [state, dispatch, isPending] = useActionState(actionFn, initialState);
```

The `actionFn(previousState, formData)` receives the **resolved** state from the previous call. Actions are **sequential**: each waits for the previous to resolve before running. The first click gets `42`, returns `43`. The second click gets `43`, returns `44`. The third gets `44`, returns `45`.

No stale closures. No race conditions.

### Step 3: Wire it up

1. Implement `likeAction(previousCount, _formData)` that calls `fakeLikeApi(previousCount)` and returns the new count
2. Call `useActionState(likeAction, 42)` to get `[likeCount, dispatch, isPending]`
3. Use `dispatch` as the form `action` (or call it from a button click)
4. Disable the button while `isPending`, show the current count

### Verify

Click "Like" three times quickly. The count should go from 42 to 45. Each click is queued and processed in order.

---

## Key reading

- [useActionState](https://react.dev/reference/react/useActionState)
- [useOptimistic](https://react.dev/reference/react/useOptimistic)
- [Building Design Components with Action Props](https://aurorascharff.no/posts/building-design-components-with-action-props-using-async-react/)
- [Async React demo](https://github.com/rickhanlonii/async-react)
