/**
 * Exercise 10: Actions & the Action Prop
 * ========================================
 *
 * Mental model: React 19 introduces async actions — functions that run inside
 * a transition. This lets React track pending state, sequence updates, and
 * handle optimistic UI automatically, replacing a lot of manual useState ceremony.
 *
 * Key reading:
 *   - https://react.dev/reference/react/useActionState
 *   - https://react.dev/reference/react/useOptimistic
 *   - https://aurorascharff.no/posts/building-design-components-with-action-props-using-async-react/
 *   - https://github.com/rickhanlonii/async-react
 *
 * In our codebase:
 *   - `useTransition` is used in productListSerp.tsx for refetch transitions
 *   - `useOptimistic` replaces the manual `optimisticOverride ?? serverEnabled`
 *     pattern from Exercise 02 (NotificationPreference)
 *   - Action props are the pattern the React ecosystem is moving toward for
 *     design components — Relay mutations fit naturally into this model
 */

import type { FunctionComponent } from "react";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Shared types and fake API
// (read these — don't modify)
// ---------------------------------------------------------------------------

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

// Simulates a network call. Fails ~20% of the time to let you test error states.
const addTodoApi = async (text: string): Promise<Todo> => {
  await new Promise((resolve) => setTimeout(resolve, 800));
  if (Math.random() < 0.2) throw new Error("Server error — please try again");
  return { id: crypto.randomUUID(), text, completed: false };
};

// ---------------------------------------------------------------------------
// Exercise A: Todo List with Manual State Management
//
// This component adds a todo via a fake async API.
// It manually tracks pending state, error state, and optimistic display.
//
// Study the code: identify how much boilerplate exists purely to manage the
// async lifecycle (isPending, error, optimistic item, cleanup on error).
//
// Questions to answer before moving on:
//   1. How many useState calls are involved in the async lifecycle alone?
//   2. What happens if the user submits twice quickly? Is there a race?
//   3. What would you have to add to prevent double-submit?
//   4. The optimistic item is removed on error — how does that work here?
//
// You do NOT need to change this component. It is the "before" version.
// ---------------------------------------------------------------------------

export const TodoListManual: FunctionComponent = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState("");

  // ❌ Manual async lifecycle state — the ceremony we want to eliminate
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimisticTodo, setOptimisticTodo] = useState<Todo | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isPending) return;

    const text = inputValue.trim();

    // ❌ Three separate state updates just to enter the pending state
    setIsPending(true);
    setError(null);
    setOptimisticTodo({ id: "optimistic", text, completed: false });
    setInputValue("");

    try {
      const newTodo = await addTodoApi(text);
      setTodos((prev) => [...prev, newTodo]);
      setOptimisticTodo(null); // ❌ Manual cleanup on success
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setOptimisticTodo(null); // ❌ Manual cleanup on failure
      setInputValue(text); // ❌ Manual restore input on failure
    } finally {
      setIsPending(false); // ❌ Yet another manual state update
    }
  };

  // Build the display list: confirmed todos + optimistic item if pending
  const displayedTodos = optimisticTodo
    ? [...todos, optimisticTodo]
    : todos;

  return (
    <div>
      <h2>Exercise A — Manual State Management</h2>

      <form onSubmit={handleSubmit}>
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Add a todo..."
          disabled={isPending}
        />
        <button type="submit" disabled={isPending}>
          {isPending ? "Adding..." : "Add"}
        </button>
      </form>

      {error && (
        <p style={{ color: "red" }}>
          {error}
        </p>
      )}

      <ul>
        {displayedTodos.map((todo) => (
          <li
            key={todo.id}
            style={{ opacity: todo.id === "optimistic" ? 0.5 : 1 }}
          >
            {todo.text}
            {todo.id === "optimistic" && " (saving...)"}
          </li>
        ))}
      </ul>

      <p style={{ fontSize: 12, color: "#999" }}>
        Count the useState calls just for async state: isPending, error,
        optimisticTodo — plus the manual cleanup in every branch.
      </p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Exercise B: Convert to Action Props Pattern
//
// Rewrite the todo list above using:
//   1. `useTransition` — gives you `isPending` for free, prevents double-submit
//   2. `useOptimistic` — shows the optimistic item, auto-reverts on failure
//   3. Form `action` prop — an async function React calls during a transition
//
// Target: the only state you should need is `todos` (the confirmed list).
// `isPending`, error display on revert, and optimistic items are handled by
// the new hooks.
//
// Steps:
//   1. Replace `const [isPending, setIsPending] = useState(false)` with
//      `const [isPending, startTransition] = useTransition()`
//   2. Replace `const [optimisticTodo, ...]` with `useOptimistic`
//   3. Change `<form onSubmit={...}>` to `<form action={...}>` where the
//      action is an async function that receives FormData
//   4. Remove all the manual setIsPending / setOptimisticTodo / try/finally
//   5. Bonus: extract the submit button into a `SubmitButton` component that
//      uses `useFormStatus()` to read pending state from the parent form —
//      no isPending prop drilling needed
//
// Note: when the action throws, useOptimistic automatically reverts the
// optimistic item — you don't need to manually call setOptimisticTodo(null).
// ---------------------------------------------------------------------------

export const TodoListWithActions: FunctionComponent = () => {
  const [todos, setTodos] = useState<Todo[]>([]);

  // TODO 1: Replace with useTransition
  // const [isPending, startTransition] = useTransition();

  // TODO 2: Replace with useOptimistic
  // const [optimisticTodos, addOptimisticTodo] = useOptimistic(
  //   todos,
  //   (state, newTodo: Todo) => [...state, newTodo],
  // );

  // TODO 3: Define an async action function that:
  //   - reads the text from FormData
  //   - calls addOptimisticTodo immediately for instant feedback
  //   - awaits addTodoApi
  //   - updates the confirmed todos list on success

  // TODO 4: Replace onSubmit with action prop on the form element

  return (
    <div>
      <h2>Exercise B — Action Props Pattern</h2>
      {/* TODO: Convert form to use action prop instead of onSubmit */}
      <form onSubmit={(e) => e.preventDefault()}>
        <input name="text" placeholder="Add a todo..." />
        <button type="submit">
          Add
        </button>
      </form>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>{todo.text}</li>
        ))}
      </ul>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Exercise C: useActionState for Sequential Actions
//
// Add a "like" counter to a post. Requirements:
//   - Clicking "Like" calls a fake async API that returns the new count
//   - While the request is in flight, show a spinner / disable the button
//   - Actions queue: if the user clicks fast, each click waits for the previous
//
// Use `useActionState` — it combines reducer + async + pending into one hook:
//
//   const [state, dispatch, isPending] = useActionState(actionFn, initialState);
//
//   - `actionFn(previousState, formData)` — receives current state + FormData
//   - Returns the next state (can be async)
//   - `dispatch` — call this to trigger the action (or use as form `action`)
//   - `isPending` — true while the action is running
//
// The key insight: actions are SEQUENTIAL. If the user clicks "Like" three
// times quickly, React queues the calls and runs them one at a time, always
// passing the LATEST resolved state as `previousState`. No race conditions.
//
// TODO:
//   1. Implement `likeAction(previousCount, _formData)` that calls
//      `fakeLikeApi(previousCount)` and returns the new count
//   2. Wire it up with `useActionState`
//   3. Disable the button while isPending, show current count
// ---------------------------------------------------------------------------

// Simulates liking a post — returns the new like count
const fakeLikeApi = async (currentCount: number): Promise<number> => {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return currentCount + 1;
};

export const LikeButton: FunctionComponent = () => {
  // TODO: Replace this with useActionState
  const [likeCount, setLikeCount] = useState(42);
  const [isPending, setIsPending] = useState(false);

  const handleLike = async () => {
    // ❌ Manual pending + sequential logic
    setIsPending(true);
    try {
      const newCount = await fakeLikeApi(likeCount);
      setLikeCount(newCount);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div>
      <h2>Exercise C — useActionState</h2>
      <p>
        Problem: click the button 3 times quickly. Each click fires
        fakeLikeApi with the SAME currentCount (42) because React batches
        renders but the state snapshot is stale. You end up with 43, not 45.
      </p>
      {/* TODO: Convert to form with useActionState dispatch as action */}
      <button onClick={handleLike} disabled={isPending}>
        {isPending ? "..." : `♡ Like (${likeCount})`}
      </button>
    </div>
  );
};
