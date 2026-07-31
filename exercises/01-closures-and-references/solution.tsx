/**
 * Exercise 01: Closures & Reference Equality — ANSWERS
 * ====================================================
 *
 * Every snippet's output, why it comes out that way, and what each one maps
 * to in React. Released after the session.
 */

import type { FunctionComponent } from "react";

// ---------------------------------------------------------------------------
// Part A: Closures — answers
// ---------------------------------------------------------------------------

export const ClosuresExercise: FunctionComponent = () => {
  return (
    <div>
      <h2>A: Closures — Answers</h2>

      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ padding: 12, background: "#f0fdf0", borderRadius: 8 }}>
          <strong>Snippet 1: Basic closure capture</strong>
          <pre style={{ fontSize: 13, margin: "8px 0" }}>{`let count = 0;
const log = () => console.log("count:", count);
count = 5;
count = 10;
log();`}</pre>
          <p><strong style={{ color: "#16a34a" }}>Output: count: 10</strong></p>
          <p style={{ fontSize: 13, color: "#666" }}>
            The closure captures the <em>variable</em> <code>count</code>, not its value at creation time.
            When <code>log()</code> runs, it reads the current value of <code>count</code>, which is 10.
            <br/><br/>
            <strong>Wait — doesn't this contradict "each render has its own values"?</strong><br/>
            No! In React, each render calls the component function, creating a <em>new</em> <code>const count = ...</code>.
            The closure captures that new constant — it CAN'T change within a single render.
            The <code>let</code> vs <code>const</code> distinction is key.
          </p>
        </div>

        <div style={{ padding: 12, background: "#fef2f2", borderRadius: 8 }}>
          <strong>Snippet 2: var in loop</strong>
          <pre style={{ fontSize: 13, margin: "8px 0" }}>{`for (var i = 0; i < 3; i++) {
  fns.push(() => console.log("i:", i));
}`}</pre>
          <p><strong style={{ color: "#dc2626" }}>Output: i: 3, i: 3, i: 3</strong></p>
          <p style={{ fontSize: 13, color: "#666" }}>
            <code>var</code> is function-scoped — there's ONE <code>i</code> shared by all closures.
            By the time the closures run, the loop has finished and <code>i</code> is 3.
          </p>
        </div>

        <div style={{ padding: 12, background: "#f0fdf0", borderRadius: 8 }}>
          <strong>Snippet 3: let in loop</strong>
          <pre style={{ fontSize: 13, margin: "8px 0" }}>{`for (let i = 0; i < 3; i++) {
  fns.push(() => console.log("i:", i));
}`}</pre>
          <p><strong style={{ color: "#16a34a" }}>Output: i: 0, i: 1, i: 2</strong></p>
          <p style={{ fontSize: 13, color: "#666" }}>
            <code>let</code> is block-scoped — each iteration gets its own <code>i</code>.
            Each closure captures a different binding.
            <br/><br/>
            <strong>React connection:</strong> This is exactly how React works! Each render is like
            a loop iteration with <code>let</code> — your component function runs, creates new
            <code>const</code> bindings, and closures (event handlers, effects) capture those specific values.
          </p>
        </div>

        <div style={{ padding: 12, background: "#fef2f2", borderRadius: 8 }}>
          <strong>Snippet 4: setTimeout captures a snapshot</strong>
          <pre style={{ fontSize: 13, margin: "8px 0" }}>{`currentValue = 1;
setTimeout(() => {
  console.log("after 1s, currentValue:", currentValue);
}, 1000);
currentValue = 999;`}</pre>
          <p><strong style={{ color: "#dc2626" }}>Output: after 1s, currentValue: 999</strong></p>
          <p style={{ fontSize: 13, color: "#666" }}>
            The setTimeout closure captures the <code>let currentValue</code> variable.
            By the time it fires, <code>currentValue</code> has been changed to 999.
            <br/><br/>
            <strong>React connection:</strong> In React, state is a <code>const</code> per render, so
            a setTimeout in an event handler always sees the value from that render — it CAN'T
            be stale within that render. But if you use a <code>useRef</code>, you're back to
            the mutable <code>let</code> behavior — the ref always reads the latest value.
          </p>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 12, background: "#f0f9ff", borderRadius: 8, fontSize: 13 }}>
        <strong>Key takeaway:</strong> Closures capture variables, not values.
        React makes this safe by using <code>const</code> per render — each render's
        closures are frozen to that render's values. <code>useRef</code> is the intentional
        escape hatch when you need the mutable <code>let</code> behavior.
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Part B: Reference equality — answers
// ---------------------------------------------------------------------------

export const ReferenceEqualityExercise: FunctionComponent = () => {
  return (
    <div>
      <h2>B: Reference Equality — Answers</h2>

      <div style={{ display: "grid", gap: 8 }}>
        {[
          { code: '"hello" === "hello"', result: "true", note: "Primitives compare by value" },
          { code: "42 === 42", result: "true", note: "Primitives compare by value" },
          { code: "{} === {}", result: "false", note: "Two objects = two references" },
          { code: "[] === []", result: "false", note: "Two arrays = two references" },
          { code: "const a = {x:1}; const b = a; a === b", result: "true", note: "Same reference" },
          { code: "(() => 42) === (() => 42)", result: "false", note: "Two functions = two references" },
          { code: '{limit:20} === {limit:20}', result: "false", note: "Same content, different references!" },
          { code: "JSON.stringify(obj) === JSON.stringify(obj)", result: "true", note: "Strings are primitives" },
        ].map((item, i) => (
          <div key={i} style={{
            padding: 8,
            background: item.result === "true" ? "#f0fdf0" : "#fef2f2",
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}>
            <code style={{ flex: 1, fontSize: 13 }}>{item.code}</code>
            <strong style={{ color: item.result === "true" ? "#16a34a" : "#dc2626", minWidth: 40 }}>{item.result}</strong>
            <span style={{ fontSize: 12, color: "#666" }}>{item.note}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, padding: 12, background: "#f0f9ff", borderRadius: 8, fontSize: 13 }}>
        <strong>The dependency array rule:</strong> React compares deps with <code>Object.is()</code>.
        On every render, your component function runs again. Any object, array, or function
        created inside the component is a <strong>new reference</strong> — even if the content
        is identical. This is why:
        <ul style={{ marginTop: 8 }}>
          <li><code>{"useEffect(() => {...}, [{ limit: 20 }])"}</code> — runs every render (new object each time)</li>
          <li><code>{"<Child style={{ color: 'red' }} />"}</code> — breaks React.memo (new object each time)</li>
          <li><code>{"const fn = () => doStuff()"}</code> in deps — runs every render (new function each time)</li>
        </ul>
        Solutions: extract constants outside the component, use primitive deps, or <code>useMemo</code>/<code>useCallback</code>.
      </div>
    </div>
  );
};
