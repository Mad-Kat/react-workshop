/**
 * Exercise 07: DOM Refs & the Safe Mutation Window — SOLUTIONS
 * =============================================================
 */

import {
  type FunctionComponent,
  type Ref,
  useCallback,
  useEffect,
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

// PROVIDED — paint timeline recorder (same as exercise)
const timelineEvents: string[] = [];
const timelineStart = performance.now();

const recordTimelineEvent = (event: string) => {
  if (performance.now() - timelineStart < 1000) {
    timelineEvents.push(event);
  }
};

{
  let frame = 0;
  const loop = () => {
    frame += 1;
    recordTimelineEvent(`browser paints frame ${frame}`);
    if (frame < 3) requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

const PaintTimeline: FunctionComponent = () => {
  const [events, setEvents] = useState<string[] | null>(null);
  useEffect(() => {
    const remaining = Math.max(0, 1000 - (performance.now() - timelineStart));
    const timer = setTimeout(() => setEvents([...timelineEvents]), remaining);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ background: "#f5f5f5", padding: 12, marginTop: 12, fontSize: 13 }}>
      <strong>Paint timeline</strong> (what happened in the first second)
      {events === null ? (
        <p>recording…</p>
      ) : (
        <ol style={{ margin: "8px 0 4px", fontFamily: "monospace" }}>
          {events.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ol>
      )}
      <button onClick={() => window.location.reload()}>⟳ Reload to re-record</button>
    </div>
  );
};

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
  recordTimelineEvent(
    `render (width: ${inputWidth === null ? "measuring…" : `${inputWidth}px`})`,
  );

  // useLayoutEffect fires synchronously after DOM mutations but BEFORE paint.
  // The paint timeline proves it: "measured" always appears BEFORE
  // "browser paints frame 1". The first frame the user sees already has the
  // width — the "measuring…" state is never painted.
  //
  // With useEffect there is no such guarantee: the measurement is scheduled
  // after paint, so the timeline (usually) shows frame 1 painted with
  // "measuring…" first — a flash, whether or not your eyes catch it.
  //
  // Rule of thumb: useEffect for most side effects (data fetching, subscriptions).
  // useLayoutEffect ONLY when you need to measure/mutate the DOM before paint
  // — it blocks painting, so keep it fast.
  useLayoutEffect(() => {
    const input = containerRef.current?.querySelector("input");
    if (input) {
      const width = input.getBoundingClientRect().width;
      recordTimelineEvent(`measured ${width}px`);
      setInputWidth(width);
    }
  }, []);

  return (
    <div ref={containerRef}>
      <FancyInput ref={fancyInputRef} placeholder="Type here..." />
      <button onClick={() => fancyInputRef.current?.focus()}>Focus</button>
      <button onClick={() => fancyInputRef.current?.clear()}>Clear</button>
      <p>Input width: {inputWidth !== null ? `${inputWidth}px` : "measuring…"}</p>
      <PaintTimeline />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Solution B: ScrollSafeInput with ref callback + cleanup return
//
// >> INSTRUCTOR: React 19 ref callbacks can return a cleanup function.
// >> When a cleanup function is returned, React skips the legacy
// >> "call with null on detach" behavior — cleanup handles it instead.
// >> (Callbacks that DON'T return a cleanup still get called with null,
// >> for backwards compatibility.)
//
// The ref callback receives the DOM node when attached. Return a cleanup
// function to run on detach. No useEffect needed, no null check needed.
// ---------------------------------------------------------------------------

export const ScrollSafeInput: FunctionComponent<{
  value: number;
  onChange: (value: number) => void;
}> = ({ value, onChange }) => {
  const [expanded, setExpanded] = useState(false);

  // Ref callback with cleanup return (React 19+).
  // React calls this at the exact moment the div appears in the DOM — even
  // though the panel starts collapsed. When it returns a cleanup function,
  // React calls that on detach instead of invoking the callback with null.
  const attachContainer = useCallback((container: HTMLDivElement) => {
    const listener = (event: WheelEvent) => {
      if (container.matches(":focus-within")) {
        event.preventDefault();
      }
    };

    container.addEventListener("wheel", listener, { passive: false });

    return () => {
      container.removeEventListener("wheel", listener);
    };
  }, []);

  return (
    <div>
      <button onClick={() => setExpanded((e) => !e)}>
        {expanded ? "Hide" : "Show"} advanced settings
      </button>
      {expanded && (
        <div ref={attachContainer} style={{ marginTop: 8 }}>
          <label>
            Max price:{" "}
            <input
              type="number"
              value={value}
              onChange={(e) => onChange(Number(e.target.value))}
            />
          </label>
        </div>
      )}
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
 *    New: return () => { cleanup() } — React calls the cleanup on detach
 *    instead of invoking the callback with null. (Without a returned
 *    cleanup, the null-call behavior still exists for backwards compat.)
 *
 * 3. useImperativeHandle: expose a custom API, not the raw DOM node.
 *    This is a deliberate API boundary — the parent gets specific methods.
 *
 * 4. useLayoutEffect: runs synchronously after DOM mutation, before paint.
 *    Use it for DOM measurements (getBoundingClientRect, offsetHeight, etc.)
 *    that must be reflected in the same paint. useEffect gives no ordering
 *    guarantee relative to paint — the paint timeline makes the difference
 *    visible. Rule: default to useEffect; reach for useLayoutEffect only when
 *    an intermediate state must never be painted.
 *
 * Real codebase references:
 *   - libraries/community-comment-form/src/communityCommentForm.tsx: forwardRef + useImperativeHandle (legacy)
 *   - blocks/form/src/components/inputField/inputField.tsx: ref callback for wheel event
 */
