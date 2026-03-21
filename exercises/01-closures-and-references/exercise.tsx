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
 * Key reading:
 *   - https://overreacted.io/a-complete-guide-to-useeffect/ (closures section)
 *   - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures
 */

import type { FunctionComponent } from "react";
import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Exercise A: Closures — functions capture values at creation time
//
// Each snippet has a "What will be logged?" question.
// Predict the output, then click "Run" to verify.
// ---------------------------------------------------------------------------

// Snippet 1: Basic closure capture
function createSnippet1() {
  let count = 0;

  const log = () => console.log("count:", count);

  count = 5;
  count = 10;

  return log; // What does log() print?
}

// Snippet 2: Closure in a loop
function createSnippet2() {
  const fns: Array<() => void> = [];

  for (var i = 0; i < 3; i++) {
    fns.push(() => console.log("i:", i));
  }

  return fns; // What does each fn() print?
}

// Snippet 3: Closure with let (block scoping)
function createSnippet3() {
  const fns: Array<() => void> = [];

  for (let i = 0; i < 3; i++) {
    fns.push(() => console.log("i:", i));
  }

  return fns; // What does each fn() print now?
}

// Snippet 4: The React connection — setTimeout captures a snapshot
function createSnippet4SetState(setValue: (v: number) => void) {
  let currentValue = 0;

  // Simulates: click handler sets state, then reads it in a timeout
  currentValue = 1;
  setValue(currentValue);

  setTimeout(() => {
    // This closure captured `currentValue` at creation time
    console.log("after 1s, currentValue:", currentValue);
  }, 1000);

  // But what if someone changes it before the timeout fires?
  currentValue = 999;
}

export const ClosuresExercise: FunctionComponent = () => {
  const [results, setResults] = useState<string[]>([]);
  const resultsRef = useRef<string[]>([]);

  // Capture console.log output for display
  const runWithCapture = (label: string, fn: () => void) => {
    const captured: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => {
      captured.push(args.map(String).join(" "));
      origLog(...args);
    };
    try {
      fn();
    } finally {
      console.log = origLog;
    }
    resultsRef.current = [...resultsRef.current, `--- ${label} ---`, ...captured];
    setResults([...resultsRef.current]);
  };

  // For snippet 4, we need to handle the async timeout
  const runSnippet4 = () => {
    const captured: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => {
      captured.push(args.map(String).join(" "));
      origLog(...args);
    };

    createSnippet4SetState(() => {});

    // Wait for the timeout to fire
    setTimeout(() => {
      console.log = origLog;
      resultsRef.current = [...resultsRef.current, "--- Snippet 4: setTimeout snapshot ---", ...captured];
      setResults([...resultsRef.current]);
    }, 1200);
  };

  return (
    <div>
      <h2>A: Closures</h2>
      <p style={{ color: "#666", fontSize: 14 }}>
        Predict the output for each snippet, then click "Run" to verify.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <button onClick={() => runWithCapture("Snippet 1: basic capture", () => {
            const log = createSnippet1();
            log();
          })}>
            Run Snippet 1
          </button>
          <p style={{ fontSize: 12, color: "#999" }}>What does log() print?<br/>count was 0 when log was created, then changed to 10.</p>
        </div>

        <div>
          <button onClick={() => runWithCapture("Snippet 2: var in loop", () => {
            const fns = createSnippet2();
            fns.forEach(fn => fn());
          })}>
            Run Snippet 2
          </button>
          <p style={{ fontSize: 12, color: "#999" }}>What does each fn() print?<br/>Hint: <code>var</code> is function-scoped.</p>
        </div>

        <div>
          <button onClick={() => runWithCapture("Snippet 3: let in loop", () => {
            const fns = createSnippet3();
            fns.forEach(fn => fn());
          })}>
            Run Snippet 3
          </button>
          <p style={{ fontSize: 12, color: "#999" }}>Same loop but with <code>let</code>.<br/>What changes?</p>
        </div>

        <div>
          <button onClick={runSnippet4}>
            Run Snippet 4
          </button>
          <p style={{ fontSize: 12, color: "#999" }}>setTimeout fires after 1s.<br/>Does it see 1 or 999?</p>
        </div>
      </div>

      <div style={{ background: "#1e1e1e", color: "#d4d4d4", padding: 16, borderRadius: 8, fontFamily: "monospace", fontSize: 13, minHeight: 100, whiteSpace: "pre-wrap" }}>
        {results.length === 0
          ? "// Output will appear here..."
          : results.map((line, i) => (
              <div key={i} style={{ color: line.startsWith("---") ? "#569cd6" : "#d4d4d4" }}>{line}</div>
            ))}
      </div>

      <button onClick={() => { resultsRef.current = []; setResults([]); }} style={{ marginTop: 8 }}>
        Clear output
      </button>
    </div>
  );
};

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
    </div>
  );
};
