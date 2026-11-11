/**
 * Exercise 07: DOM Refs & the Safe Mutation Window
 * ==================================================
 *
 * Mental model: Safe to read/mutate DOM in event handlers and effects
 * (after commit), never during render.
 *
 * Key reading:
 *   - https://react.dev/learn/manipulating-the-dom-with-refs
 *   - https://react.dev/reference/react/useLayoutEffect
 *
 * `npm test` runs the "Done when" lists below in your browser.
 */

import type { FunctionComponent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Exercise A: FancyInput
//
// `FancyInput` is a text input that keeps track of its own value. The form
// around it needs to do two things to it: put the cursor in it, and empty it.
// The Focus and Clear buttons are there for that, and don't do anything yet.
//
// The form gets those two things and nothing else. With the <input> itself
// it could restyle it, or change its value behind FancyInput's back.
//
// Done when:
//   - Focus puts the cursor in the input
//   - Clear empties the input and puts the cursor in it
//   - a ref passed to FancyInput ends up holding `focus()` and `clear()` and
//     nothing else: not the <input>
//   - FancyInput still owns its value: the form doesn't keep it in state
// ---------------------------------------------------------------------------

export const FancyInput: FunctionComponent<{
  placeholder?: string;
}> = ({ placeholder }) => {
  const [value, setValue] = useState("");

  return (
    <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} />
  );
};

export const FancyInputDemo: FunctionComponent = () => {
  return (
    <div>
      <FancyInput placeholder="Type here..." />
      <button onClick={() => {}}>Focus</button>
      <button onClick={() => {}}>Clear</button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Exercise B: Hint Bubble
//
// Hovering a `HintButton` shows its hint in a bubble just above the button,
// or just below it when there isn't room above. How tall the bubble is
// depends on how much text it holds, so it has to be measured before it can
// be placed. `HintBubble` is deliberately slow to render, like a component on
// a busy page.
//
// Hover the buttons. The bubble lands on top of the button instead of above
// it, whatever the hint says.
//
// Done when:
//   - the bubble sits just above the button, for a short hint and a long one
//   - it sits just below the button when there isn't room above it
//   - you never see it anywhere else, not even for a moment
//   - `HintBubble` is still as slow as it is now: making it faster doesn't
//     count
// ---------------------------------------------------------------------------

const GAP = 8;

const HintBubble: FunctionComponent<{
  targetRect: DOMRect;
  children: ReactNode;
}> = ({ targetRect, children }) => {
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Simulate expensive render work
  const end = performance.now() + 150;
  while (performance.now() < end) {
    // deliberate busy-wait
  }

  // Above the button if it fits, below it if it doesn't
  const height = bubbleRef.current?.offsetHeight ?? 0;
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

// ---------------------------------------------------------------------------
// Exercise C: Scroll-Safe Input
//
// A quantity you change by clicking Edit. Number inputs change their value
// when you scroll over them while they have focus, so someone scrolling down
// the page could change the quantity without noticing. While the input has
// focus, the wheel is supposed to do nothing at all.
//
// Click Edit, keep the mouse over the number and scroll. The number changes.
//
// Done when:
//   - scrolling over the focused input never changes the number, however
//     often you open and close the editor
//   - closing the editor leaves no wheel listener behind
//   - the code that adds the listener doesn't need to know why the <div>
//     comes and goes: if the <div> gets another reason to appear or
//     disappear later, that code doesn't change
// ---------------------------------------------------------------------------

export const ScrollSafeInput: FunctionComponent<{
  value: number;
  onChange: (value: number) => void;
}> = ({ value, onChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Swallow wheel events while the input has focus
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

  if (!isEditing) {
    return (
      <p>
        Quantity: {value} <button onClick={() => setIsEditing(true)}>Edit</button>
      </p>
    );
  }

  return (
    <div ref={containerRef}>
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
