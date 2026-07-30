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

// ---------------------------------------------------------------------------
// PROVIDED — paint timeline recorder (don't modify).
//
// Records renders, your measurement, and the browser's first paints, in
// order, for one second after page load. The timeline below the demo shows
// you what happened before the user saw the first frame — something your
// eyes are too slow to catch.
// ---------------------------------------------------------------------------

const timelineEvents: string[] = [];
const timelineStart = performance.now();

export const recordTimelineEvent = (event: string) => {
  if (performance.now() - timelineStart < 1000) {
    timelineEvents.push(event);
  }
};

// Log the first few frames. requestAnimationFrame runs right before the
// browser paints, after all DOM updates for that frame are in place.
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

// TODO: Define the FancyInputHandle interface
// TODO: Create FancyInput that accepts `ref` prop and uses useImperativeHandle

// Placeholder — replace with your implementation
export const FancyInput: FunctionComponent<{
  placeholder?: string;
}> = ({ placeholder }) => {
  const [value, setValue] = useState("");

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
    />
  );
};

// Parent component that uses FancyInput
export const FancyInputDemo: FunctionComponent = () => {
  const [inputWidth, setInputWidth] = useState<number | null>(null);
  recordTimelineEvent(
    `render (width: ${inputWidth === null ? "measuring…" : `${inputWidth}px`})`,
  );

  // TODO 1: Create a ref with the FancyInputHandle type
  // TODO 2: Wire up the Focus and Clear buttons to use the ref
  //
  // TODO 3: Measure the input width after mount with useEffect and put it in
  //   `inputWidth`. Inside the effect, log the measurement:
  //     recordTimelineEvent(`measured ${width}px`);
  //   Then read the paint timeline below. Where did "measured" land relative
  //   to "browser paints frame 1"? What did the user see in that first frame?
  //   - Which hook runs after DOM mutation but BEFORE the browser paints?
  //     Switch to it, reload, and compare the timelines.
  //   - Note: your FancyInputHandle ref only has focus() and clear() —
  //     you'll need a separate container ref for DOM measurement.

  return (
    <div>
      <FancyInput placeholder="Type here..." />
      <button onClick={() => console.log("TODO: focus")}>Focus</button>
      <button onClick={() => console.log("TODO: clear")}>Clear</button>
      <p>Input width: {inputWidth === null ? "measuring…" : `${inputWidth}px`}</p>
      <PaintTimeline />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Exercise B: Ref callback with cleanup function
//
// >> INSTRUCTOR: React 19 ref callbacks can return a cleanup function.
// >> When a cleanup function is returned, React no longer calls the
// >> callback with null on detach — cleanup handles it instead.
//
// A number input inside a collapsed-by-default "advanced settings" panel.
// Scrolling over a focused number input changes its value — we want to
// prevent that with a non-passive wheel listener.
//
// REPRODUCE THE BUG FIRST:
//   1. Click "Show advanced settings"
//   2. Focus the number input
//   3. Scroll over it — the value changes! The listener was never attached.
//
// Why: the effect ran once on mount, while the panel was still collapsed.
// containerRef.current was null, so the effect bailed out. Nothing re-runs
// it when the panel finally renders the div.
//
// TODO: Refactor to a ref callback that returns a cleanup function.
//   The callback runs at the exact moment the node appears in the DOM —
//   no matter when that is. No timing gap, no null check, no useEffect.
// ---------------------------------------------------------------------------

export const ScrollSafeInput: FunctionComponent<{
  value: number;
  onChange: (value: number) => void;
}> = ({ value, onChange }) => {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Broken approach: useRef + useEffect.
  // The effect runs once on mount — while the panel is collapsed and the
  // div doesn't exist. The listener is never attached.
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
    <div>
      <button onClick={() => setExpanded((e) => !e)}>
        {expanded ? "Hide" : "Show"} advanced settings
      </button>
      {expanded && (
        <div ref={containerRef} style={{ marginTop: 8 }}>
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
