/**
 * Exercise 07: DOM Refs & the Safe Mutation Window
 * ==================================================
 *
 * Mental model: Safe to read/mutate DOM in event handlers and effects
 * (after commit), never during render.
 *
 * If you get stuck, open guide.md for step-by-step thinking.
 *
 * Key reading:
 *   - https://react.dev/learn/manipulating-the-dom-with-refs
 *   - https://react.dev/reference/react/useLayoutEffect
 */

import type { FunctionComponent, Ref } from "react";
import { useEffect, useImperativeHandle, useRef, useState } from "react";
// Note: Ref is imported for your solution — you'll need it when adding the ref prop

// ---------------------------------------------------------------------------
// Exercise A: Build a FancyInput with ref as prop + useImperativeHandle
//
// >> INSTRUCTOR: React 19 lets you pass `ref` as a regular prop — no more
// >> forwardRef wrapper. Show the old forwardRef syntax for context (it still
// >> works but is deprecated), then demonstrate the new way.
//
// Requirements:
//   1. The parent should be able to call .focus() and .clear()
//   2. The parent should NOT have access to the full DOM node
//   3. Accept `ref` as a regular prop (React 19+) and use useImperativeHandle
// ---------------------------------------------------------------------------

// TODO: Define the FancyInputHandle interface
// TODO: Create FancyInput that accepts `ref` prop and uses useImperativeHandle

// Placeholder — replace with your implementation
export const FancyInput: FunctionComponent<{
  placeholder?: string;
}> = ({ placeholder }) => {
  const [value, setValue] = useState("");

  return (
    <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} />
  );
};

// Parent component that uses FancyInput
export const FancyInputDemo: FunctionComponent = () => {
  // TODO 1: Create a ref with the FancyInputHandle type
  // TODO 2: Wire up the Focus and Clear buttons to use the ref
  //
  // TODO 3: Measure the input width after mount and display it below.
  //   - Using useEffect causes a flash (render → paint → measure → repaint).
  //   - Which hook runs after DOM mutation but BEFORE the browser paints?
  //   - Note: your FancyInputHandle ref only has focus() and clear() —
  //     you'll need a separate container ref for DOM measurement.
  //   Tip: if you don't see a flash with useEffect, open Chrome DevTools →
  //   Performance → CPU: 6x slowdown. Try useEffect first, then switch to
  //   useLayoutEffect to see the difference.

  return (
    <div>
      <FancyInput placeholder="Type here..." />
      <button onClick={() => console.log("TODO: focus")}>Focus</button>
      <button onClick={() => console.log("TODO: clear")}>Clear</button>
      <p>Input width: ???px</p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Exercise B: Ref callback with cleanup function
//
// >> INSTRUCTOR: React 19 ref callbacks can return a cleanup function.
// >> The callback is only called with the node (never null). Detach is
// >> handled by the returned cleanup function. Before React 19, the
// >> callback was called with null on detach, which was confusing.
//
// A number input that should prevent scroll-to-change behavior.
// Currently uses useRef + useEffect — refactor to use a ref callback
// that returns a cleanup function (React 19+).
// ---------------------------------------------------------------------------

export const ScrollSafeInput: FunctionComponent<{
  value: number;
  onChange: (value: number) => void;
}> = ({ value, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Current approach: useRef + useEffect
  // Problem: the effect runs on mount, but if the ref isn't attached yet
  // (e.g., conditional rendering), the listener is never attached.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const listener = (event: WheelEvent) => {
      if (container.matches(":focus-within")) {
        event.preventDefault();
      }
    };

    container.addEventListener("wheel", listener, { passive: false });
    return () => container.removeEventListener("wheel", listener);
  }, []);

  return (
    <div ref={containerRef}>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
};

// TODO: Refactor ScrollSafeInput to use a ref callback that returns a cleanup function
