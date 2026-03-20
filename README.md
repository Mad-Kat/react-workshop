# Improved React Workshop — Digitec Galaxus

Internal workshop for medior engineers who work in this codebase. They know React/JSX basics, write TypeScript daily, and have reviewed PRs — but may lack deep mental models for React's render cycle, effects, and async primitives.

**Philosophy:** Rewire mental models, not teach syntax. Every exercise uses patterns, hooks, and anti-patterns from our actual codebase. Participants fix buggy or suboptimal code — not blank-slate builds. This mirrors real work and forces reading before writing.

**Format:** One exercise per week, hosted in a CodeSandbox repo. ~30 min hands-on + 10 min group discussion of learnings. Exercises are released weekly.

**Stack context:** Next.js Pages Router, Relay, next-yak, Vitest. Exercises reference real packages (`@segments/relay`, `@blocks/lazy`, `@segments/error-boundary`, etc.) so participants recognize patterns in their daily work.

---

## Curriculum

```
Phase 1: Reactivity & the Render Model     (Exercises 1–3)
Phase 2: Effects as Synchronization         (Exercises 4–6)
Phase 3: Memoization — The Last Resort      (Exercise 7)
Phase 4: Refs & the Imperative Boundary     (Exercise 8)
Phase 5: Async React                        (Exercises 9–12)
Phase 6: Composition Patterns               (Exercises 13–14)
Phase 7: SSR & Hydration                    (Exercise 15)
```

Each phase assumes the previous. You can't teach `useTransition` (Exercise 10) before re-render mechanics (Exercise 1). You can't teach hydration mismatches (Exercise 15) before understanding that hooks run in both passes.

| # | Exercise | Mental Model | Time |
|---|----------|-------------|------|
| 01 | State Shape & Derived State | If you can compute it during render, don't put it in state | 30 min |
| 02 | State as Snapshot & Key Trick | Setting state doesn't change the variable — each render is a snapshot | 30 min |
| 03 | Refs — Non-rendering Values | Refs are a "secret pocket" — mutable, not tracked by React | 30 min |
| 04 | What Effects Are Actually For | Effects synchronize with external systems — nothing else | 25 min |
| 05 | The Dependency Contract | The linter doesn't suggest deps — it discovers them from your code | 30 min |
| 06 | Events vs Effects | Event handlers respond to specific actions; effects respond to synchronization needs | 30 min |
| 07 | Memoization Pitfalls | Memoization is a performance optimization, not a correctness tool. Measure first | 30 min |
| 08 | DOM Refs & Imperative Handle | Safe to read/mutate DOM in event handlers and effects, never during render | 30 min |
| 09 | Race Conditions & Cleanup | When a component re-renders before async response arrives, the response is stale | 30 min |
| 10 | Actions & the Action Prop | Components own the transition, the optimistic state, and the pending UI | 35 min |
| 11 | Suspense with `use()` | Suspense says "this subtree is waiting — show a fallback until it's ready" | 30 min |
| 12 | Error Boundaries | Error boundaries catch rendering errors. They do NOT catch event handlers or async code | 25 min |
| 13 | Custom Hooks as Sync Units | A custom hook encapsulates a piece of reactive synchronization into a reusable unit | 35 min |
| 14 | Compound Components | Context used internally by a component family. Consumer API is clean; wiring is hidden | 30 min |
| 15 | SSR & Hydration | Server has no window. The first client render MUST match server output | 30 min |

---

## Making It Interactive

### React Scan — Visualize Re-renders

[React Scan](https://github.com/aidenybai/react-scan) highlights components as they re-render with colored outlines (frequency → color intensity). Drop it into any exercise sandbox:

```bash
npx -y react-scan@latest init
```

**Use in:** Exercises 1 (see double-render flash), 3 (see timer-driven cascade), 5 (see infinite loop go red), 7 (see useless memos don't change render count), 10 (see transition keep input responsive).

### Render Counter Hook

Add to any exercise for concrete measurement:

```tsx
function useRenderCount(label: string) {
  const count = useRef(0);
  count.current++;
  console.log(`[${label}] render #${count.current}`);
}
```

Before fix: 3 renders per change. After fix: 1. Concrete, measurable.

### React DevTools Profiler

For Exercise 7 (memoization) specifically, teach students to use:
1. "Highlight updates when components render" toggle
2. Profiler flamegraph to see which components re-rendered
3. "Why did this render?" tooltip

### Performance Measurement

For Exercise 10 (actions/transitions), add `console.time`/`console.timeEnd` to see blocking time.

---

## Pre-reading Assignments

Assign before each session so exercise time is spent on the codebase-specific twist, not the general concept.

| Exercise | Pre-reading |
|----------|------------|
| 01 | [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) — do the 4 interactive challenges |
| 02 | [State as a Snapshot](https://react.dev/learn/state-as-a-snapshot) |
| 03 | [Referencing Values with Refs](https://react.dev/learn/referencing-values-with-refs) |
| 04–06 | [Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects) + [Removing Effect Dependencies](https://react.dev/learn/removing-effect-dependencies) |
| 07 | [developerway.com — React re-renders guide](https://www.developerway.com/posts/react-re-renders-guide) |
| 08 | [Manipulating the DOM with Refs](https://react.dev/learn/manipulating-the-dom-with-refs) |
| 09 | [react.dev — Fetching Data](https://react.dev/learn/synchronizing-with-effects#fetching-data) |
| 10 | [Aurora Scharff — Building Design Components with Action Props](https://aurorascharff.no/posts/building-design-components-with-action-props-using-async-react/) + [useOptimistic docs](https://react.dev/reference/react/useOptimistic) |
| 11 | [use() — React docs](https://react.dev/reference/react/use) + [How Suspense Works Under the Hood](https://www.epicreact.dev/how-react-suspense-works-under-the-hood-throwing-promises-and-declarative-async-ui-plbrh) |
| 12 | [Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary) |
| 13 | [Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks) |
| 14 | [Scaling Up with Reducer and Context](https://react.dev/learn/scaling-up-with-reducer-and-context) |
| 15 | [Josh Comeau — Making Sense of RSC](https://www.joshwcomeau.com/react/server-components/) |

---

## Reference Material

### React Official Docs
- [react.dev/learn](https://react.dev/learn) — The new interactive React docs
- [useActionState](https://react.dev/reference/react/useActionState)
- [useOptimistic](https://react.dev/reference/react/useOptimistic)
- [use()](https://react.dev/reference/react/use)
- [ViewTransition](https://react.dev/reference/react/ViewTransition)
- [React Server Components](https://react.dev/reference/rsc/server-components)
- [React Performance Tracks](https://react.dev/reference/dev-tools/react-performance-tracks)

### Async React (React 19+)
- [Async React demo — React Conf 2025](https://github.com/rickhanlonii/async-react)
- [Async React Working Group](https://github.com/reactwg/async-react/discussions/2)
- [React 19.2: The async shift](https://blog.logrocket.com/react-19-2-the-async-shift/)
- [Aurora Scharff — Action Props Pattern](https://aurorascharff.no/posts/building-design-components-with-action-props-using-async-react/)
- [Aurora Scharff — Reusable Components with React 19 Actions](https://aurorascharff.no/posts/building-reusable-components-with-react19-actions/)

### Visualization & Interactive Learning
- [react.gg/visualized](https://react.gg/visualized) — Animated React concept visualizations
- [Joy of React](https://www.joyofreact.com/) — Josh Comeau's interactive course
- [Epic React](https://www.epicreact.dev/) — Kent C. Dodds' deep-dive course
- [React Scan](https://github.com/aidenybai/react-scan) — Render visualization overlay
- [Sandpack](https://sandpack.codesandbox.io/) — Embeddable live code editor

### Reactivity Models (for context)
- [Fine-grained Reactivity — Solid docs](https://docs.solidjs.com/advanced-concepts/fine-grained-reactivity) — Contrast with React's coarse-grained model

---

## What Changed from v1

The original workshop had 18 days. This version consolidates to 15 exercises:

1. **Cut Day 8** (Debounced Search) — folded `previousValue` pattern into Exercise 03
2. **Cut Day 11** (Relay Refetching) — too library-specific; replaced with Exercise 10 (Actions & Action Prop) covering modern React 19 patterns
3. **Merged Days 17+18** (SSR + Hydration) — one conceptual unit, pick best 4 of 6 sub-exercises
4. **Upgraded Exercise 01D** — manual optimistic override → `useOptimistic`
5. **Upgraded Exercise 11** — hand-rolled `createResource` → `use()` hook
6. **Fixed Exercise 07 Problem 4** — description was wrong (function DID use state)
7. **Added Exercise 07 Problem 5** — `React.memo` (was missing entirely)
8. **Added Exercise 10** — new exercise covering `useTransition`, `useOptimistic`, `useActionState`, and the action prop pattern
9. **Added RSC/streaming discussion** to Exercise 15
10. **Added interactivity guidance** — React Scan, render counters, DevTools Profiler instructions
