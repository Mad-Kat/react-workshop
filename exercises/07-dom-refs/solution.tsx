/**
 * Exercise 07: DOM Refs & the Safe Mutation Window — SOLUTIONS
 * =============================================================
 */

import {
  type FunctionComponent,
  type Ref,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

// ---------------------------------------------------------------------------
// Solution A: FancyInput with ref as a regular prop + useImperativeHandle
//
// >> INSTRUCTOR: React 19 deprecates forwardRef. Function components now accept
// >> `ref` as a regular prop. This is a significant API simplification — show
// >> the old forwardRef wrapper for context, then point out how much cleaner
// >> the new version is. Our codebase still uses forwardRef in many places;
// >> new code should use the ref-as-prop pattern.
// ---------------------------------------------------------------------------

export interface FancyInputHandle {
  focus: () => void;
  clear: () => void;
}

// React 19+: ref is just a prop — no forwardRef wrapper needed
export const FancyInput: FunctionComponent<{
  placeholder?: string;
  ref?: Ref<FancyInputHandle>;
}> = ({ placeholder, ref }) => {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Expose only focus() and clear() — not the full DOM node
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

// Parent using the handle
export const FancyInputDemo: FunctionComponent = () => {
  const fancyInputRef = useRef<FancyInputHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [inputWidth, setInputWidth] = useState<number | null>(null);

  // useLayoutEffect fires synchronously after DOM mutations but BEFORE paint.
  // This means the width is measured and set before the user ever sees
  // "measuring..." — no flash.
  //
  // If this were useEffect, the user would briefly see "measuring..." then
  // the width — a visible flash. useLayoutEffect avoids this because React
  // waits for it to finish before handing control to the browser to paint.
  //
  // Rule of thumb: useEffect for most side effects (data fetching, subscriptions).
  // useLayoutEffect ONLY when you need to measure/mutate the DOM before paint.
  useLayoutEffect(() => {
    const input = containerRef.current?.querySelector("input");
    if (input) {
      setInputWidth(input.getBoundingClientRect().width);
    }
  }, []);

  return (
    <div ref={containerRef}>
      <FancyInput ref={fancyInputRef} placeholder="Type here..." />
      <button onClick={() => fancyInputRef.current?.focus()}>Focus</button>
      <button onClick={() => fancyInputRef.current?.clear()}>Clear</button>
      <p>Input width: {inputWidth !== null ? `${inputWidth}px` : "measuring..."}</p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Solution B: ScrollSafeInput with ref callback + cleanup return
//
// >> INSTRUCTOR: React 19 ref callbacks can return a cleanup function.
// >> The callback is only called with the node (never null). Detach is
// >> handled by the returned cleanup. Before React 19, the callback was
// >> called with null on unmount, which was confusing and error-prone.
//
// The ref callback receives the DOM node when attached. Return a cleanup
// function to run on detach. No useEffect needed, no null check needed.
// ---------------------------------------------------------------------------

export const ScrollSafeInput: FunctionComponent<{
  value: number;
  onChange: (value: number) => void;
}> = ({ value, onChange }) => {
  // Ref callback with cleanup return (React 19+)
  // In React 19, the callback is only called with the node on attach.
  // It is never called with null — cleanup is handled by the return function.
  const containerRef = useCallback((container: HTMLDivElement) => {
    const listener = (event: WheelEvent) => {
      if (container.matches(":focus-within")) {
        event.preventDefault();
      }
    };

    container.addEventListener("wheel", listener, { passive: false });

    // React 19: return a cleanup function (replaces the old "called with null" pattern)
    return () => {
      container.removeEventListener("wheel", listener);
    };
  }, []);

  return (
    <div ref={containerRef}>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
};

/**
 * Key takeaways:
 *
 * 1. ref as a regular prop (React 19+): no more forwardRef wrapper.
 *    Old: const FancyInput = forwardRef((props, ref) => { ... })
 *    New: const FancyInput = ({ ref, ...props }) => { ... }
 *    forwardRef still works but is deprecated. New code should use ref-as-prop.
 *
 * 2. Ref callback cleanup (React 19+): return a cleanup function.
 *    Old: called with null on unmount (had to guard with if (!node) return)
 *    New: callback receives the node (never null), return () => { cleanup() }
 *    The callback is only called on attach. Detach is handled by the return.
 *
 * 3. useImperativeHandle: expose a custom API, not the raw DOM node.
 *    This is a deliberate API boundary — the parent gets specific methods.
 *
 * 4. useLayoutEffect: runs synchronously after DOM mutation, before paint.
 *    Use it for DOM measurements (getBoundingClientRect, offsetHeight, etc.)
 *    that must be reflected in the same paint. useEffect would cause a flash.
 *    Rule: default to useEffect; only use useLayoutEffect when you see a flash.
 *
 * Real codebase references:
 *   - libraries/community-comment-form/src/communityCommentForm.tsx: forwardRef + useImperativeHandle (legacy)
 *   - blocks/form/src/components/inputField/inputField.tsx: ref callback for wheel event
 */
