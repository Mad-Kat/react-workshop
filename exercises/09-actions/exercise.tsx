/**
 * Exercise 09: Actions & the Action Prop
 * ========================================
 *
 * Mental model: Components own the transition, the optimistic state, and
 * the pending UI. React 19 actions eliminate manual async state management.
 *
 * If you get stuck, open guide.md for the layer-by-layer approach.
 *
 * Key reading:
 *   - https://react.dev/reference/react/useActionState
 *   - https://react.dev/reference/react/useOptimistic
 *   - https://aurorascharff.no/posts/building-design-components-with-action-props-using-async-react/
 */

import type { FunctionComponent } from "react";
import { useState, useTransition } from "react";

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
// Rewrite the todo list using React 19 actions. Work in layers:
//
// Layer 1 — Replace isPending with useTransition:
//   - `const [isPending, startTransition] = useTransition()`
//   - Wrap the async work in `startTransition(async () => { ... })`
//   - Delete setIsPending(true/false) — it's automatic now
//   - You'll need to add useTransition and useOptimistic to your imports
//
// Layer 2 — Replace optimistic state with useOptimistic:
//   - `const [optimisticTodos, addOptimisticTodo] = useOptimistic(
//        todos, (state, newTodo: Todo) => [...state, newTodo]
//      )`
//   - Call addOptimisticTodo inside the transition for instant feedback
//   - When the transition ends (success or failure), it auto-reverts
//
// Layer 3 — Replace onSubmit with form action:
//   - `<form action={async (formData) => { ... }}>`
//   - Read input value: `formData.get("text")`
//   - No e.preventDefault(), no controlled input state needed
//   - React resets the form automatically after the action completes
//
// Bonus: Extract a SubmitButton that uses useFormStatus() from react-dom
// ---------------------------------------------------------------------------

export const TodoListWithActions: FunctionComponent = () => {
  const [todos, setTodos] = useState<Todo[]>([]);

  // Layer 1 (provided): useTransition tracks isPending automatically
  const [isPending, startTransition] = useTransition();

  // TODO 2: Replace optimistic state with useOptimistic

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
