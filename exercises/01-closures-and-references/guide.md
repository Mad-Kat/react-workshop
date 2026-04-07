# Exercise 01: Way to get to the solution

## The two mental models

This exercise builds the two foundational concepts that explain ~80% of React's behavior. Every later exercise builds on one or both of them.

---

## Part A: Closures

### Start by looking at Snippet 1

```js
let count = 0;
const log = () => console.log("count:", count);
count = 5;
count = 10;
log();
```

### Step 1: What do you expect `log()` to print?

The function `log` is created on line 2, when `count` is `0`. So you might guess it prints `count: 0`.

Run it.

### Step 2: Why does it print `count: 10`?

The key is what a closure actually captures. It does not take a snapshot of the value at creation time. It captures the **variable itself**, the binding. Think of it like holding a pointer, not a photocopy.

When `log()` finally executes, it reads `count` at that moment. By then, `count` has been reassigned to `10`.

### Step 3: How does this connect to React?

This might seem dangerous. But React makes it safe. In a component, state is declared as `const count = ...` per render. A closure (event handler, effect) captures that `const`. Since `const` can't be reassigned, the closure always sees the value from the render that created it. No surprises.

---

### Now look at Snippet 2

```js
for (var i = 0; i < 3; i++) {
  fns.push(() => console.log("i:", i));
}
```

### Step 4: What do you expect each function to print?

Three functions are created, one per iteration. You might expect `i: 0`, `i: 1`, `i: 2`.

Run it.

### Step 5: Why is it `i: 3, i: 3, i: 3`?

`var` is **function-scoped**, not block-scoped. There is only ONE `i` variable for the entire function. All three closures capture that same `i`. By the time any of them execute, the loop has finished and `i` is `3` (the exit condition).

This is the classic "closure in a loop" trap. It exists because `var` doesn't create a new binding per iteration.

---

### Now look at Snippet 3 (almost identical)

```js
for (let i = 0; i < 3; i++) {
  fns.push(() => console.log("i:", i));
}
```

### Step 6: The only change is `var` to `let`. What do you expect now?

Run it.

### Step 7: Why does `let` fix it?

`let` is **block-scoped**. JavaScript creates a *new* `i` binding for each iteration of the loop. Each closure captures its own `i`, frozen at the value for that iteration.

### Step 8: So what does React rendering have in common with a `let` loop?

Each render is like a loop iteration with `let`:

```
Render 1: const count = 0;  // closure captures this
Render 2: const count = 1;  // new binding, new closure
Render 3: const count = 2;  // new binding, new closure
```

Event handlers and effects from render 1 see `count = 0`. Those from render 2 see `count = 1`. They never interfere. Each render has its own isolated scope, just like each loop iteration with `let`.

---

### Now look at Snippet 4

```js
let currentValue = 0;
currentValue = 1;
setTimeout(() => {
  console.log("after 1s, currentValue:", currentValue);
}, 1000);
currentValue = 999;
```

### Step 9: What do you expect the timeout to log?

The `setTimeout` callback is created when `currentValue` is `1`. But then `currentValue` is reassigned to `999` before the timeout fires.

Run it.

### Step 10: Why `999`? And how does this connect to React state?

Same principle as Snippet 1. The closure captures the `let currentValue` variable, not its value. By the time the timeout fires (1 second later), `currentValue` has been changed to `999`. The closure reads the current value at execution time, not creation time.

In React, state is a `const` per render, so a `setTimeout` in an event handler always sees the value from that render. It can't be stale within that render:

```tsx
const [count, setCount] = useState(0);
const handleClick = () => {
  setCount(1);
  setTimeout(() => {
    console.log(count); // always 0, the const from THIS render
  }, 1000);
};
```

But if you use `useRef`, you're back to the mutable `let` behavior because `ref.current` always reads the latest value across renders. This is Exercise 04's topic.

---

### Summary: it's about scoping, not keywords

The snippets above demonstrate one principle: **a closure sees whatever the binding holds when it executes, not when it was created.** The outcome depends on how many bindings exist and whether they can be reassigned.

| Scenario | How many bindings? | Can it change? | Closure sees... |
|---|---|---|---|
| `let` in function body, mutated later | One | Yes | The latest value |
| `var` in a loop | One (function-scoped) | Yes | The final value (bug) |
| `let` in a loop | One per iteration (block-scoped) | No* | Each iteration's value |
| `const` (anywhere) | One per scope | No | The value it was initialized with |

*Technically `let` can be reassigned, but the loop creates a fresh binding each iteration, so within each closure's scope it effectively doesn't change.

**React connection:** Each render call creates a fresh scope with new `const` bindings for state and props. Closures from that render (event handlers, effects, timeouts) capture those bindings. Since they're `const`, they can't change within that render's scope. This is why "each render has its own values." When you need to escape this and read the latest value across renders, you use `useRef`, which gives you a single mutable object that persists across renders (Exercise 04).

---

## Part B: Reference Equality

### Start with Comparisons 1 and 2

```js
"hello" === "hello"  // ?
42 === 42            // ?
```

### Step 1: What do you expect?

Both `true`. Strings and numbers are primitives. Primitives are compared by their actual value. Two strings with the same characters are equal. Simple.

Run it to confirm.

---

### Now look at Comparisons 3 and 4

```js
{} === {}    // ?
[] === []    // ?
```

### Step 2: Same content, so both `true`?

Run it.

### Step 3: Why are they `false`?

Every time you write `{}` or `[]`, JavaScript allocates a new object in memory. Two separate allocations mean two different memory addresses, which means they are not equal, even if the contents are identical.

Think of it like two identical houses on different streets. Same blueprint, different addresses.

---

### Now Comparison 5

```js
const a = { x: 1 };
const b = a;
a === b  // ?
```

### Step 4: What changes when you assign instead of creating?

`b` doesn't get a copy. It gets the same address as `a`. They point to the exact same object in memory. Like two people holding the same house key.

Run it. This one is `true`.

---

### Comparison 6

```js
const fn1 = () => 42;
const fn2 = () => 42;
fn1 === fn2  // ?
```

### Step 5: Functions look identical. Equal?

Run it.

Each arrow function expression creates a new function object. Even with identical bodies, they're different objects at different memory addresses. This is the most React-relevant comparison because every render creates new inline functions.

---

### Comparison 7

```js
{ limit: 20, sort: "desc" } === { limit: 20, sort: "desc" }  // ?
```

### Step 6: Same content, different references. What does this mean for React?

This is `false`. Same content does not mean same reference. This is exactly why `useEffect(() => { ... }, [{ limit: 20 }])` runs on every render. React sees a "new" object each time.

---

### Comparison 8

```js
const obj = { x: 1 };
JSON.stringify(obj) === JSON.stringify(obj)  // ?
```

### Step 7: Why is this one `true`?

`JSON.stringify` returns a **string** (a primitive). Strings are compared by value. So this is `true`. But it's expensive (serialization on every comparison) and fragile (key ordering isn't guaranteed across engines). It's a workaround, not a solution.

---

### Step 8: So why do dependency arrays keep firing?

React uses `Object.is()` (essentially `===`) to compare dependency array entries between renders. On every render, your component function runs again. Anything created inside the component body is a **new reference**:

```tsx
function MyComponent() {
  // NEW object every render:
  const options = { limit: 20 };

  // NEW function every render:
  const handleClick = () => doSomething();

  // React sees these as "changed" every render:
  useEffect(() => { ... }, [options]);     // runs every render
  useEffect(() => { ... }, [handleClick]); // runs every render
}
```

Solutions you'll learn in later exercises:
- **Exercise 04 (Refs):** `useRef` for values that shouldn't trigger re-renders
- **Exercise 06 (Memoization):** `useMemo` / `useCallback` to preserve references
- **Exercise 06 (Problem 4):** Extract pure functions to module scope for free stability

---

## Self-check

Before moving on, you should be able to answer:

> Why does `useEffect(() => fetch(url), [{ page: 1 }])` run on every render?

**Answer:** Two concepts combine. (B) The object `{ page: 1 }` is a new reference every render, so React thinks the dependency changed. (A) The effect callback closes over whatever `url` was in that render's scope, but that's not the problem here; the problem is the object reference in the deps array.

## Key reading

- [A Complete Guide to useEffect](https://overreacted.io/a-complete-guide-to-useeffect/), especially the "Each Render Has Its Own..." sections
- [MDN: Closures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures)
