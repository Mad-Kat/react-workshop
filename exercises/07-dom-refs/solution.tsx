/**
 * Exercise 07: DOM Refs & the Safe Mutation Window — SOLUTIONS
 * =============================================================
 */

import {
  type FunctionComponent,
  type ReactNode,
  type Ref,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

// ---------------------------------------------------------------------------
// Solution A: FancyInput
//
// Since React 19, `ref` is a regular prop on function components, so
// FancyInput takes it like any other prop, without a forwardRef wrapper.
// useImperativeHandle decides what the parent's ref ends up holding: an object
// with focus() and clear(), built on top of a ref to the <input> that never
// leaves the component.
// ---------------------------------------------------------------------------

export interface FancyInputHandle {
  focus: () => void;
  clear: () => void;
}

export const FancyInput: FunctionComponent<{
  placeholder?: string;
  ref?: Ref<FancyInputHandle>;
}> = ({ placeholder, ref }) => {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // `setValue` and `inputRef` never change, so the handle never has to be
  // rebuilt.
  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        inputRef.current?.focus();
      },
      clear: () => {
        setValue("");
        inputRef.current?.focus();
      },
    }),
    [],
  );

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
    />
  );
};

export const FancyInputDemo: FunctionComponent = () => {
  const fancyInputRef = useRef<FancyInputHandle>(null);

  return (
    <div>
      <FancyInput ref={fancyInputRef} placeholder="Type here..." />
      <button onClick={() => fancyInputRef.current?.focus()}>Focus</button>
      <button onClick={() => fancyInputRef.current?.clear()}>Clear</button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Solution B: Scroll-Safe Input
//
// The effect ran once, on mount, when the editor was closed and there was no
// <div> to attach to. A ref callback is tied to the node instead of to the
// component: React calls it when the <div> is attached, and since it returns
// a cleanup function (React 19+), calls that cleanup when the <div> is
// detached. However often the editor opens and closes, the listener comes
// and goes with the <div>, and nothing here mentions `isEditing`.
//
// The callback has to keep its identity between renders. A new function on
// every render would make React detach and re-attach the listener each time.
// This one uses nothing from the component, so it lives at module level. One
// that needs props or state would go into useCallback.
// ---------------------------------------------------------------------------

const swallowWheelWhileFocused = (container: HTMLDivElement) => {
  const listener = (event: WheelEvent) => {
    if (container.matches(":focus-within")) {
      event.preventDefault();
    }
  };

  container.addEventListener("wheel", listener, { passive: false });
  return () => container.removeEventListener("wheel", listener);
};

export const ScrollSafeInput: FunctionComponent<{
  value: number;
  onChange: (value: number) => void;
}> = ({ value, onChange }) => {
  const [isEditing, setIsEditing] = useState(false);

  if (!isEditing) {
    return (
      <p>
        Quantity: {value} <button onClick={() => setIsEditing(true)}>Edit</button>
      </p>
    );
  }

  return (
    <div ref={swallowWheelWhileFocused}>
      <input
        type="number"
        autoFocus
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <button onClick={() => setIsEditing(false)}>Done</button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Solution C (optional): Hint Bubble
//
// The bubble's height only exists once the bubble is in the DOM, and during
// render it isn't yet: on the first render `bubbleRef.current` is null. So
// the height is measured after commit and kept in state, and the bubble is
// placed on the render that follows.
//
// useLayoutEffect runs after React has written to the DOM but before the
// browser paints. A state update inside it is rendered right away, still
// before the paint, so the first frame the browser shows already has the
// bubble in the right place. useEffect would let the browser paint the
// unmeasured bubble first, on top of the button, and move it one slow
// render later.
// ---------------------------------------------------------------------------

const GAP = 8;

const HintBubble: FunctionComponent<{
  targetRect: DOMRect;
  children: ReactNode;
}> = ({ targetRect, children }) => {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  // Simulate expensive render work
  const end = performance.now() + 150;
  while (performance.now() < end) {
    // deliberate busy-wait
  }

  // Measure before the browser paints, so the unmeasured bubble is never seen
  useLayoutEffect(() => {
    if (bubbleRef.current) {
      setHeight(bubbleRef.current.offsetHeight);
    }
  }, []);

  // Above the button if it fits, below it if it doesn't
  const fitsAbove = targetRect.top - GAP - height >= 0;
  const top = fitsAbove ? targetRect.top - GAP - height : targetRect.bottom + GAP;

  return (
    <div
      ref={bubbleRef}
      role="tooltip"
      style={{
        position: "fixed",
        top,
        left: targetRect.left,
        width: 240,
        padding: "6px 10px",
        borderRadius: 6,
        background: "#222",
        color: "#fff",
        fontSize: 13,
        pointerEvents: "none",
      }}
    >
      {children}
    </div>
  );
};

// Unchanged: reading the button's position in an event handler is safe,
// because by the time the user can hover it, it has long been committed.
export const HintButton: FunctionComponent<{
  label: string;
  hint: string;
}> = ({ label, hint }) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  return (
    <>
      <button
        onMouseEnter={(e) => setTargetRect(e.currentTarget.getBoundingClientRect())}
        onMouseLeave={() => setTargetRect(null)}
      >
        {label}
      </button>
      {targetRect && <HintBubble targetRect={targetRect}>{hint}</HintBubble>}
    </>
  );
};

/**
 * Notes on the APIs used here:
 *
 * 1. ref as a regular prop (React 19+): no forwardRef wrapper needed.
 *    Old: const FancyInput = forwardRef((props, ref) => { ... })
 *    New: const FancyInput = ({ ref, ...props }) => { ... }
 *    forwardRef still works. React plans to deprecate it in a future release.
 *
 * 2. Ref callback cleanup (React 19+): a ref callback may return a cleanup
 *    function. If it does, React calls the cleanup on detach instead of
 *    calling the callback with null. If it doesn't, React still calls it
 *    with null on detach, like before.
 *
 * 3. useImperativeHandle: the parent's ref holds an object you build, not the
 *    DOM node. A deliberate API boundary.
 *
 * 4. useLayoutEffect: runs after React writes to the DOM, before the browser
 *    paints, and state updates inside it are rendered before the paint too.
 *    For measurements that decide what the first frame looks like. It blocks
 *    the paint, so default to useEffect.
 *
 * Real codebase references:
 *   - libraries/community-comment-form/src/communityCommentForm.tsx: forwardRef + useImperativeHandle (legacy)
 *   - blocks/form/src/components/inputField/inputField.tsx: ref callback for wheel event
 */

// ---------------------------------------------------------------------------
// Key takeaway
//   Refs reach the DOM; useImperativeHandle decides how much of it the
//   parent gets. Read and mutate in event handlers and effects, never
//   during render — and reach for useLayoutEffect only to kill a flash.
// ---------------------------------------------------------------------------
