/**
 * Exercise 01, Part B — UI only.
 *
 * Part B is predict-then-click: the comparison is on screen, the participant
 * commits to true or false out loud, then clicks the card to check. Nothing
 * here is read or edited during the exercise, and the list below holds the
 * answers, so it lives outside exercise.tsx.
 */

import type { FunctionComponent } from "react";
import { useState } from "react";

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
        why exercises 05 and 06 exist.
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
