# Improved React Workshop — Digitec Galaxus

Internal workshop for medior engineers who work in this codebase. They know React/JSX basics, write TypeScript daily, and have reviewed PRs — but may lack deep mental models for React's render cycle, effects, and async primitives.

**Philosophy:** Rewire mental models, not teach syntax. Every exercise uses patterns, hooks, and anti-patterns from our actual codebase. Participants fix buggy or suboptimal code, build components from interfaces, or predict behavior — not blank-slate builds. This mirrors real work and forces reading before writing.

**Format:** One exercise per week, hosted in a CodeSandbox repo. ~30 min hands-on + 15 min group discussion of learnings. Exercises are released weekly.

**Stack context:** Next.js Pages Router, Relay, next-yak, Vitest. Exercises reference real packages (`@segments/relay`, `@blocks/lazy`, `@segments/error-boundary`, etc.) so participants recognize patterns in their daily work.

---

## Curriculum

```
Phase 1: Foundations & Mental Models           (Exercises 1–4)
Phase 2: Effects as Synchronization            (Exercise 5)
Phase 3: Memoization — The Last Resort         (Exercise 6)
Phase 4: Refs & the Imperative Boundary        (Exercise 7)
Phase 5: Async React                           (Exercises 8–11)
Phase 6: SSR & Hydration                       (Exercise 12)
```

Each phase assumes the previous. You can't teach hydration mismatches (Exercise 12) before understanding that hooks run in both passes.

| # | Exercise | Format | Mental Model | Time |
|---|----------|--------|-------------|------|
| 01 | Closures & Reference Equality | Predict-and-verify | Functions capture values; `===` compares references, not content | 30 min |
| 02 | State Shape & Derived State | Fix bad code | If you can compute it during render, don't put it in state | 30 min |
| 03 | State as Snapshot & Key Trick | Fix bad code | Setting state doesn't change the variable — each render is a snapshot | 30 min |
| 04 | Refs — Non-rendering Values | Fix bad code | Refs are a "secret pocket" — mutable, not tracked by React | 30 min |
| 05 | What Effects Are Actually For | Fix bad code | Effects synchronize with external systems — nothing else | 25 min |
| 06 | Memoization Pitfalls | Fix bad code | Memoization is a performance optimization, not a correctness tool. Measure first | 30 min |
| 07 | DOM Refs & Imperative Handle | Build from scratch | Safe to read/mutate DOM in event handlers and effects, never during render | 30 min |
| 08 | Race Conditions & Cleanup | Build from scratch | When a component re-renders before async response arrives, the response is stale | 30 min |
| 09 | Actions & the Action Prop | Build from scratch | Components own the transition, the optimistic state, and the pending UI | 35 min |
| 10 | Suspense with `use()` | Fix bad code | Suspense says "this subtree is waiting — show a fallback until it's ready" | 30 min |
| 11 | Error Boundaries | Fix bad code | Error boundaries catch rendering errors. They do NOT catch event handlers or async code | 25 min |
| 12 | SSR & Hydration | Fix bad code | Server has no window. The first client render MUST match server output | 30 min |

---

## Exercise Formats

The workshop uses three exercise formats:

- **Predict-and-verify** (Ex 01): Participants predict output of code snippets, then run to verify. Builds intuition before touching React code.
- **Fix bad code** (Ex 02–06, 10–12): Participants receive a buggy component and must diagnose and fix the anti-pattern. Builds pattern recognition.
- **Build from scratch** (Ex 07–09): Participants receive an interface/API and a consumer component, then implement the missing piece. Forces design decisions.

---

## Making It Interactive

### React Scan — Visualize Re-renders

[React Scan](https://github.com/aidenybai/react-scan) highlights components as they re-render with colored outlines (frequency → color intensity). It's pre-installed in this repo.

**Use in:** Exercises 2 (see double-render flash), 4 (see timer-driven cascade), 6 (see useless memos don't change render count), 9 (see transition keep input responsive).

### Render Counter Hook

Exercises 02, 05, and 06 include a built-in `useRenderCount()` hook that displays a red badge with the current render count. This makes unnecessary re-renders immediately visible — participants can see the number drop when they fix the anti-pattern.

### React DevTools Profiler

For Exercise 06 (memoization) specifically, teach students to use:
1. "Highlight updates when components render" toggle
2. Profiler flamegraph to see which components re-rendered
3. "Why did this render?" tooltip

---

## Pre-reading Assignments

Assign before each session so exercise time is spent on the codebase-specific twist, not the general concept.

| Exercise | Pre-reading |
|----------|------------|
| 01 | [A Complete Guide to useEffect](https://overreacted.io/a-complete-guide-to-useeffect/) — read the "Each Render Has Its Own..." sections |
| 02 | [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) — do the 4 interactive challenges |
| 03 | [State as a Snapshot](https://react.dev/learn/state-as-a-snapshot) |
| 04 | [Referencing Values with Refs](https://react.dev/learn/referencing-values-with-refs) |
| 05 | [Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects) + [Removing Effect Dependencies](https://react.dev/learn/removing-effect-dependencies) |
| 06 | [developerway.com — React re-renders guide](https://www.developerway.com/posts/react-re-renders-guide) |
| 07 | [Manipulating the DOM with Refs](https://react.dev/learn/manipulating-the-dom-with-refs) |
| 08 | [react.dev — Fetching Data](https://react.dev/learn/synchronizing-with-effects#fetching-data) |
| 09 | [Aurora Scharff — Building Design Components with Action Props](https://aurorascharff.no/posts/building-design-components-with-action-props-using-async-react/) + [useOptimistic docs](https://react.dev/reference/react/useOptimistic) |
| 10 | [use() — React docs](https://react.dev/reference/react/use) + [How Suspense Works Under the Hood](https://www.epicreact.dev/how-react-suspense-works-under-the-hood-throwing-promises-and-declarative-async-ui-plbrh) |
| 11 | [Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary) |
| 12 | [Josh Comeau — Making Sense of RSC](https://www.joshwcomeau.com/react/server-components/) |

---

## Reference Material

### Foundational
- [A Complete Guide to useEffect — Dan Abramov](https://overreacted.io/a-complete-guide-to-useeffect/) — The mental model for closures, snapshots, and effects that underpins this entire workshop

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

### Reactivity Models (for context)
- [Fine-grained Reactivity — Solid docs](https://docs.solidjs.com/advanced-concepts/fine-grained-reactivity) — Contrast with React's coarse-grained model

---

## What Changed from v1

The original workshop had 18 days. This version consolidates to 12 exercises:

1. **Added Exercise 01** — Closures & Reference Equality (predict-and-verify warm-up). Establishes the two foundational mental models before any React-specific exercises.
2. **Cut Day 8** (Debounced Search) — folded `previousValue` pattern into Exercise 04 (Refs)
3. **Cut old Exercise 06** (Events vs Effects) — redundant with Exercise 05 (effects classification). The `pendingVariablesRef` pattern is mentioned in Exercise 05's discussion.
4. **Cut Day 11** (Relay Refetching) — too library-specific; replaced with Exercise 09 (Actions & Action Prop) covering modern React 19 patterns
5. **Merged Days 17+18** (SSR + Hydration) — one conceptual unit, trimmed to 2 sub-exercises
6. **Cut Dependency Contract, Custom Hooks, and Compound Components** — focused on learn & experience over practice exercises
7. **Added build-from-scratch exercises** (07, 08, 09) — participants implement from interfaces rather than just fixing bugs
8. **Added render counters** — `useRenderCount()` hook shows live render counts in exercises where the problem is unnecessary re-renders
9. **Removed StrictMode** — its double-invocation in dev mode made render counters misleading
10. **Upgraded Exercise 02C** — manual optimistic override → `useOptimistic`
11. **Upgraded Exercise 10** — hand-rolled `createResource` → `use()` hook
12. **Added Exercise 09** — new exercise covering `useTransition`, `useOptimistic`, `useActionState`, and the action prop pattern
13. **Added dynamic exercise loading** — `?ex=01` URL parameter loads any exercise without changing `App.tsx`
