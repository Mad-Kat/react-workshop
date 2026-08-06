/**
 * Exercise 01: Closures & Reference Equality — ANSWERS
 * ====================================================
 */

import type { FunctionComponent } from "react";

export const ClosuresExercise: FunctionComponent = () => {
  return (
    <a href="https://github.com/Mad-Kat/react-workshop/blob/main/exercises/01-closures-and-references/guide.md">
      There are no code changes, so just read the guide.md
    </a>
  );
};

// ---------------------------------------------------------------------------
// Key takeaway
//   A closure captures the variable, not a copy of its value. React makes that
//   safe by giving every render its own consts.
//   `===` on objects, arrays and functions compares identity, not content —
//   which is why an inline literal in a deps array re-runs it every render.
// ---------------------------------------------------------------------------
