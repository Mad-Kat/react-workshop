/**
 * Exercise 01: Closures & Reference Equality
 * =============================================
 *
 * These two concepts explain ~80% of React's behavior.
 * Before diving into patterns, let's build the mental model.
 *
 * FORMAT: Predict-and-verify
 * For each snippet, predict the output BEFORE clicking "Run".
 * Then click to verify. The goal is to build intuition, not to fix code.
 *
 * After predicting, open guide.md for detailed explanations of WHY
 * each snippet behaves the way it does and how it connects to React.
 *
 * Key reading:
 *   - https://overreacted.io/a-complete-guide-to-useeffect/ (closures section)
 *   - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures
 */

import type { FunctionComponent } from "react";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Exercise A: Closures — functions capture variables, not snapshots
//
// Each snippet has a "What will be logged?" question.
// Predict the output, then click "Run" to verify.
// ---------------------------------------------------------------------------

// Snippet 1: Basic closure capture
export function createSnippet1() {
  let count = 0;

  const log = () => console.log("count:", count);

  count = 5;
  count = 10;

  return log; // What does log() print?
}

// Snippet 2: Closure in a loop
export function createSnippet2() {
  const fns: Array<() => void> = [];

  for (var i = 0; i < 3; i++) {
    fns.push(() => console.log("i:", i));
  }

  return fns; // What does each fn() print?
}

// Snippet 3: Closure with let (block scoping)
export function createSnippet3() {
  const fns: Array<() => void> = [];

  for (let i = 0; i < 3; i++) {
    fns.push(() => console.log("i:", i));
  }

  return fns; // What does each fn() print now?
}

// Snippet 4: The React connection — setTimeout and mutable variables
export function createSnippet4() {
  let currentValue = 0;

  currentValue = 1;

  setTimeout(() => {
    console.log("after 1s, currentValue:", currentValue);
  }, 1000);

  // What if someone changes it before the timeout fires?
  currentValue = 999;
}

// ---------------------------------------------------------------------------
// Exercise B: Reference Equality — === on objects, arrays, functions
//
// React uses Object.is() (essentially ===) to compare dependency array
// entries between renders. Understanding reference equality is critical
// for understanding why dependency arrays behave the way they do.
//
// For each comparison, predict: true or false?
// ---------------------------------------------------------------------------

interface Comparison {
  label: string;
  code: string;
  result: boolean;
  explanation: string;
}

const COMPARISONS: Comparison[] = [
  {
    label: "1",
    code: '"hello" === "hello"',
    result: true,
    explanation: "Strings are primitives — compared by value.",
  },
  {
    label: "2",
    code: "42 === 42",
    result: true,
    explanation: "Numbers are primitives — compared by value.",
  },
  {
    label: "3",
    code: "{} === {}",
    result: false,
    explanation: "Two different object literals = two different references in memory.",
  },
  {
    label: "4",
    code: "[] === []",
    result: false,
    explanation: "Two different array literals = two different references. Same as objects.",
  },
  {
    label: "5",
    code: "const a = { x: 1 }; const b = a;\na === b",
    result: true,
    explanation: "b points to the SAME object as a — same reference.",
  },
  {
    label: "6",
    code: "const fn1 = () => 42; const fn2 = () => 42;\nfn1 === fn2",
    result: false,
    explanation: "Two arrow functions = two different references, even with identical bodies.",
  },
  {
    label: "7",
    code: '{ limit: 20, sort: "desc" } === { limit: 20, sort: "desc" }',
    result: false,
    explanation: 'Same content, different references. This is why options objects in useEffect deps cause infinite loops!',
  },
  {
    label: "8",
    code: "const obj = { x: 1 };\nJSON.stringify(obj) === JSON.stringify(obj)",
    result: true,
    explanation: "JSON.stringify returns a string (primitive) — compared by value. But this is expensive and fragile.",
  },
];

export const ReferenceEqualityExercise: FunctionComponent = () => {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const reveal = (label: string) => {
    setRevealed((prev) => new Set(prev).add(label));
  };

  const revealAll = () => {
    setRevealed(new Set(COMPARISONS.map((c) => c.label)));
  };

  return (
    <div>
      <h2>B: Reference Equality</h2>
      <p style={{ color: "#666", fontSize: 14 }}>
        For each comparison, predict <strong>true</strong> or <strong>false</strong>, then click to reveal.
        This is exactly what React does when comparing dependency arrays between renders.
      </p>

      <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
        {COMPARISONS.map((comp) => {
          const isRevealed = revealed.has(comp.label);
          return (
            <div
              key={comp.label}
              style={{
                padding: 12,
                border: "1px solid #ddd",
                borderRadius: 8,
                background: isRevealed
                  ? comp.result ? "#f0fdf0" : "#fef2f2"
                  : "#fafafa",
                cursor: isRevealed ? "default" : "pointer",
              }}
              onClick={() => !isRevealed && reveal(comp.label)}
            >
              <code style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{comp.code}</code>
              {isRevealed ? (
                <div style={{ marginTop: 8 }}>
                  <strong style={{ color: comp.result ? "#16a34a" : "#dc2626" }}>
                    {String(comp.result)}
                  </strong>
                  <span style={{ marginLeft: 8, fontSize: 13, color: "#666" }}>
                    — {comp.explanation}
                  </span>
                </div>
              ) : (
                <div style={{ marginTop: 4, fontSize: 12, color: "#999" }}>
                  Click to reveal
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={revealAll}>Reveal all</button>

      <div style={{ marginTop: 16, padding: 12, background: "#f0f9ff", borderRadius: 8, fontSize: 13 }}>
        <strong>The React connection:</strong> On every render, React compares each entry
        in your dependency array with the previous render's value using <code>Object.is()</code> (same
        as <code>===</code> for our purposes). If you write <code>{"useEffect(() => { ... }, [{ limit: 20 }])"}</code>,
        the object is <strong>new every render</strong> — so the effect runs every render. This is
        why exercises 06 and 07 exist.
      </div>

      <div style={{ marginTop: 16, padding: 12, background: "#fff7ed", borderRadius: 8, fontSize: 13 }}>
        <strong>Self-check — can you answer this?</strong>
        <p style={{ marginTop: 8 }}>
          Why does <code>{"useEffect(() => fetch(url), [{ page: 1 }])"}</code> run
          on every render? Which concept from Part A and which from Part B explain it?
        </p>
      </div>
    </div>
  );
};
