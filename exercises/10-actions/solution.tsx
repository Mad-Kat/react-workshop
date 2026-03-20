/**
 * Exercise 10: Actions & the Action Prop — SOLUTIONS
 * ====================================================
 *
 * Key reading:
 *   - https://react.dev/reference/react/useActionState
 *   - https://react.dev/reference/react/useOptimistic
 *   - https://aurorascharff.no/posts/building-design-components-with-action-props-using-async-react/
 *   - https://github.com/rickhanlonii/async-react
 */

import type { FunctionComponent } from "react";
import { useActionState, useOptimistic, useTransition, useState } from "react";
import { useFormStatus } from "react-dom";

// ---------------------------------------------------------------------------
// Shared types and fake API
// ---------------------------------------------------------------------------

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

const addTodoApi = async (text: string): Promise<Todo> => {
  await new Promise((resolve) => setTimeout(resolve, 800));
  if (Math.random() < 0.2) throw new Error("Server error — please try again");
  return { id: crypto.randomUUID(), text, completed: false };
};

const fakeLikeApi = async (currentCount: number): Promise<number> => {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return currentCount + 1;
};

// Exercise A (TodoListManual) is in the exercise file — not duplicated here.

// ---------------------------------------------------------------------------
// Step 1: useTransition for pending state
//
// What changed:
//   - `useTransition()` gives us `[isPending, startTransition]`
//   - Wrapping the async work in `startTransition` makes React aware of the
//     pending state — no manual setIsPending needed
//   - The form's onSubmit wraps the async work in startTransition
//   - Double-submit prevention is automatic: startTransition is not re-entrant
//     while a transition is in flight
//
// What's still manual:
//   - The optimistic item (optimisticTodo state)
//   - Error handling (error state)
//   - Input restore on failure
// ---------------------------------------------------------------------------

export const TodoListStep1UseTransition: FunctionComponent = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [optimisticTodo, setOptimisticTodo] = useState<Todo | null>(null);

  // ✅ Step 1: useTransition gives us isPending for free
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const text = inputValue.trim();
    setInputValue("");

    // ✅ Wrap async work in startTransition — React tracks pending state
    startTransition(async () => {
      setError(null);
      setOptimisticTodo({ id: "optimistic", text, completed: false });
      try {
        const newTodo = await addTodoApi(text);
        setTodos((prev) => [...prev, newTodo]);
        setOptimisticTodo(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setOptimisticTodo(null);
        setInputValue(text);
      }
      // ✅ No finally { setIsPending(false) } — useTransition handles it
    });
  };

  const displayedTodos = optimisticTodo ? [...todos, optimisticTodo] : todos;

  return (
    <div>
      <h2>Step 1 — useTransition (isPending is free)</h2>
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
      {error && <p style={{ color: "red" }}>{error}</p>}
      <ul>
        {displayedTodos.map((todo) => (
          <li key={todo.id} style={{ opacity: todo.id === "optimistic" ? 0.5 : 1 }}>
            {todo.text}
            {todo.id === "optimistic" && " (saving...)"}
          </li>
        ))}
      </ul>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Step 2: useOptimistic for instant feedback with automatic revert
//
// What changed:
//   - `useOptimistic(todos, applyFn)` replaces `optimisticTodo` state
//   - `addOptimisticTodo(newTodo)` shows the item immediately — it's visible
//     during the transition but not in the real `todos` state
//   - On failure: the transition ends without committing to `todos`, so
//     `optimisticTodos` automatically reverts to `todos` — NO manual cleanup
//   - On success: `setTodos` commits the real item; the optimistic one merges
//
// This mirrors what our codebase does in Exercise 01's Solution C:
//   `const [optimisticEnabled, setOptimisticEnabled] = useOptimistic(serverEnabled)`
//   Instead of `optimisticOverride ?? serverEnabled` with a useEffect.
// ---------------------------------------------------------------------------

export const TodoListStep2UseOptimistic: FunctionComponent = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  // ✅ Step 2: useOptimistic replaces the manual optimisticTodo state
  // While a transition is in flight, `optimisticTodos` shows the extra item.
  // When the transition ends (success or failure), it snaps back to `todos`.
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (state, newTodo: Todo) => [...state, newTodo],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const text = inputValue.trim();
    setInputValue("");

    startTransition(async () => {
      setError(null);
      // ✅ Show optimistic item — visible immediately, auto-reverts on failure
      addOptimisticTodo({ id: "optimistic", text, completed: false });
      try {
        const newTodo = await addTodoApi(text);
        setTodos((prev) => [...prev, newTodo]);
        // ✅ No setOptimisticTodo(null) — useOptimistic handles cleanup
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setInputValue(text);
        // ✅ No setOptimisticTodo(null) — revert is automatic
      }
    });
  };

  return (
    <div>
      <h2>Step 2 — useOptimistic (auto-revert on failure)</h2>
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
      {error && <p style={{ color: "red" }}>{error}</p>}
      <ul>
        {optimisticTodos.map((todo) => (
          <li key={todo.id} style={{ opacity: todo.id === "optimistic" ? 0.5 : 1 }}>
            {todo.text}
            {todo.id === "optimistic" && " (saving...)"}
          </li>
        ))}
      </ul>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Step 3: Form action prop (async function instead of onSubmit)
//
// What changed:
//   - `<form action={asyncFn}>` replaces `<form onSubmit={...}>`
//   - React calls the action inside a transition automatically
//   - No more `e.preventDefault()` — the form doesn't navigate because the
//     action is a function (not a URL string)
//   - The action receives `FormData` — read values with `formData.get("text")`
//   - After a successful action, React resets the form inputs automatically
//
// The action prop pattern is Aurora Scharff's "design components with action
// props" — you can pass `action` as a prop just like `onClick`, making forms
// composable. The parent owns the mutation; the form just calls it.
//
// This also maps naturally to Relay mutations: the parent calls commitMutation
// inside the action, and the child form is a pure presentation component.
// ---------------------------------------------------------------------------

// >> INSTRUCTOR: useFormStatus reads the parent <form>'s pending state without
// >> prop drilling. Any component rendered inside a <form> can call it. This is
// >> how design-system submit buttons can show spinners automatically.
const SubmitButton: FunctionComponent = () => {
  // ✅ useFormStatus reads the enclosing <form>'s action pending state
  // Must be a CHILD of <form>, not the component that renders <form>
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? "Adding..." : "Add"}
    </button>
  );
};

export const TodoListStep3FormAction: FunctionComponent = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (state, newTodo: Todo) => [...state, newTodo],
  );

  // ✅ Step 3: Async action function — receives FormData, runs in a transition
  // React calls this inside startTransition automatically when the form submits.
  const addTodoAction = async (formData: FormData) => {
    const text = (formData.get("text") as string | null)?.trim() ?? "";
    if (!text) return;

    setError(null);
    addOptimisticTodo({ id: "optimistic", text, completed: false });

    try {
      const newTodo = await addTodoApi(text);
      setTodos((prev) => [...prev, newTodo]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
    // ✅ No e.preventDefault(), no finally cleanup, no input restore —
    // React resets the form automatically after the action completes.
  };

  return (
    <div>
      <h2>Step 3 — Form action + useFormStatus</h2>
      {/* ✅ action prop: React wraps this in startTransition and resets form */}
      <form action={addTodoAction}>
        <input name="text" placeholder="Add a todo..." />
        {/* ✅ SubmitButton uses useFormStatus — no isPending prop needed */}
        <SubmitButton />
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <ul>
        {optimisticTodos.map((todo) => (
          <li key={todo.id} style={{ opacity: todo.id === "optimistic" ? 0.5 : 1 }}>
            {todo.text}
            {todo.id === "optimistic" && " (saving...)"}
          </li>
        ))}
      </ul>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Step 4: useActionState for sequential actions (Like button)
//
// `useActionState` combines three things into one hook:
//   - State (replaces useState for the value being mutated)
//   - Async action (runs sequentially — next call waits for the previous)
//   - isPending (built-in, no useTransition needed)
//
// Signature:
//   const [state, dispatch, isPending] = useActionState(actionFn, initialState)
//
//   actionFn(previousState, formData): Promise<nextState> | nextState
//
// The key guarantee: actions are SEQUENTIAL. If the user clicks "Like" 3 times
// quickly, React queues the calls. Each gets the RESOLVED state from the
// previous call as `previousState`. You always end up at currentCount + 3.
//
// Compare to the manual version in the exercise: three rapid clicks all read
// the same `likeCount` snapshot (42), so all three calls return 43.
// useActionState guarantees correct sequencing automatically.
// ---------------------------------------------------------------------------

export const LikeButton: FunctionComponent = () => {
  // ✅ Step 4: useActionState — state + action + isPending in one call
  const [likeCount, dispatch, isPending] = useActionState(
    // actionFn receives the PREVIOUS resolved state — no stale closures
    async (previousCount: number, _formData: FormData) => {
      return await fakeLikeApi(previousCount);
    },
    42, // initial state
  );

  return (
    <div>
      <h2>Step 4 — useActionState (sequential, no race conditions)</h2>
      <p>
        Click rapidly: each like waits for the previous to resolve and gets the
        correct previousCount. You will always land at the right number.
      </p>
      {/* dispatch can be used directly as a form action */}
      <form action={dispatch}>
        <button type="submit" disabled={isPending}>
          {isPending ? "..." : `♡ Like (${likeCount})`}
        </button>
      </form>
    </div>
  );
};

/**
 * Key patterns demonstrated:
 *
 * 1. useTransition — tracks async pending state automatically
 *    Eliminates `const [isPending, setIsPending] = useState(false)` and all
 *    the setIsPending(true/false) calls scattered through try/finally.
 *    In our codebase: productListSerp.tsx uses startTransition for refetch.
 *
 * 2. useOptimistic — instant UI with automatic revert on failure
 *    Eliminates the manual `optimisticOverride ?? serverValue` pattern.
 *    While the transition is in flight, the optimistic value is shown.
 *    If the action throws, the value snaps back to the server truth.
 *    In our codebase: replaces the pattern from Exercise 01 Solution C.
 *
 * 3. Form action prop + useFormStatus
 *    Runs inside a transition automatically. React resets form on success.
 *    No `e.preventDefault()`. No input restore on failure.
 *    useFormStatus lets child components read pending state without prop drilling.
 *    The action can be passed as a prop — enabling composable form components.
 *
 * 4. useActionState — sequential async actions
 *    Combines reducer + async + pending into one hook.
 *    Guarantees sequential execution: next action gets resolved state from
 *    the previous. Eliminates stale closure bugs from rapid user interactions.
 *
 * Real codebase references:
 *   - libraries/product-list/src/productListSerp.tsx: useTransition for refetch
 *   - libraries/product-updates-notifications/src/productDetailPage/useSubscribeToPriceChange.tsx:
 *     manual optimistic pattern replaced by useOptimistic
 */
