/**
 * Exercise 01: Closures & Reference Equality
 * =============================================
 *
 * Two ideas that account for most surprising React behaviour. Everything
 * later in the workshop leans on them, so we start here.
 *
 * FORMAT: Predict-and-verify
 * Read each snippet, commit to an answer, then click "Run" to check it.
 * There is no bug to fix. Guessing wrong before you run it is what makes
 * the answer stick.
 *
 * Key reading:
 *   - https://overreacted.io/a-complete-guide-to-useeffect/ (closures section)
 *   - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures
 */

// ---------------------------------------------------------------------------
// Part A: Closures
//
// A closure holds on to the variable, not to a copy of what was in it.
// Four snippets, one question each: what gets logged?
// ---------------------------------------------------------------------------

// Snippet 1: what does the closure read, and when?
export function createSnippet1() {
  let count = 0;

  const log = () => console.log("count:", count);

  count = 5;
  count = 10;

  return log; // What does log() print?
}

// Snippet 2: one variable shared by three closures
export function createSnippet2() {
  const fns: Array<() => void> = [];

  for (var i = 0; i < 3; i++) {
    fns.push(() => console.log("i:", i));
  }

  return fns; // What does each fn() print?
}

// Snippet 3: same loop, block-scoped binding
export function createSnippet3() {
  const fns: Array<() => void> = [];

  for (let i = 0; i < 3; i++) {
    fns.push(() => console.log("i:", i));
  }

  return fns; // What does each fn() print now?
}

// Snippet 4: the callback fires a second after the variable moved on
export function createSnippet4() {
  let currentValue = 0;

  currentValue = 1;

  setTimeout(() => {
    console.log("after 1s, currentValue:", currentValue);
  }, 1000);

  // Which value does the timeout see?
  currentValue = 999;
}

// ---------------------------------------------------------------------------
// Part B: Reference Equality
//
// Runs in the browser, below Part A. Predict true or false for each
// comparison, then click the card to check. No code to read or edit.
// ---------------------------------------------------------------------------
