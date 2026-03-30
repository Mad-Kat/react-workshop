/**
 * Exercise 08: DOM Refs & the Safe Mutation Window — SOLUTIONS
 * =============================================================
 */

import {
  type FunctionComponent,
  type Ref,
  useCallback,
  useImperativeHandle,
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

  return (
    <div>
      <FancyInput ref={fancyInputRef} placeholder="Type here..." />
      <button onClick={() => fancyInputRef.current?.focus()}>Focus</button>
      <button onClick={() => fancyInputRef.current?.clear()}>Clear</button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Solution B: ScrollSafeInput with ref callback + cleanup return
//
// >> INSTRUCTOR: React 19 ref callbacks can return a cleanup function — just
// >> like useEffect. Before React 19, the callback was called with `null` on
// >> unmount (confusing). Now you return a cleanup function (explicit, clear).
// >> This is the recommended pattern for attaching/detaching event listeners
// >> via refs.
//
// The ref callback receives the DOM node when attached and returns a cleanup
// function when detached. No useEffect needed.
// ---------------------------------------------------------------------------

export const ScrollSafeInput: FunctionComponent<{
  value: number;
  onChange: (value: number) => void;
}> = ({ value, onChange }) => {
  // Ref callback with cleanup return (React 19+)
  const containerRef = useCallback((container: HTMLDivElement | null) => {
    if (!container) return;

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
 *    Old: called with null on unmount (had to check if (node === null) return)
 *    New: return () => { cleanup() } — same mental model as useEffect
 *
 * 3. useImperativeHandle: expose a custom API, not the raw DOM node.
 *    This is a deliberate API boundary — the parent gets specific methods.
 *
 * Real codebase references:
 *   - libraries/community-comment-form/src/communityCommentForm.tsx: forwardRef + useImperativeHandle (legacy)
 *   - blocks/form/src/components/inputField/inputField.tsx: ref callback for wheel event
 */
