# React Workshop

Internal workshop for medior engineers who work in this codebase. They know React/JSX basics, write TypeScript daily, and have reviewed PRs, but may lack deep mental models for React's render cycle, effects, and async primitives.

**Philosophy:** Rewire mental models, not teach syntax. Every exercise uses patterns, hooks, and anti-patterns from our actual codebase. Participants fix buggy or suboptimal code, build components from interfaces, or predict behavior. They don't build from a blank slate. This mirrors real work and forces reading before writing.

**Format:** One exercise every second week, run on StackBlitz off the `main` branch. ~30 min hands-on + 15 min group discussion of learnings.

> **This is the `dev` branch, the instructor's copy, with all 12 exercises and solutions.**
> Participants follow `main`, which has separate history and only contains released material.
> Release with `scripts/publish.sh NN` at the start of a session and `scripts/publish.sh NN --reveal` after it.

**Stack context:** Next.js Pages Router, Relay, next-yak, Vitest. Exercises reference real packages (`@segments/relay`, `@blocks/lazy`, `@segments/error-boundary`, etc.) so participants recognize patterns in their daily work.

## Curriculum

```
Phase 1: Foundations & Mental Models           (Exercises 1–4)
Phase 2: Effects as Synchronization            (Exercise 5)
Phase 3: Memoization: The Last Resort          (Exercise 6)
Phase 4: Refs & the Imperative Boundary        (Exercise 7)
Phase 5: Async React                           (Exercises 8–11)
Phase 6: SSR & Hydration                       (Exercise 12)
```

Each phase assumes the previous. You can't teach hydration mismatches (Exercise 12) before understanding that hooks run in both passes.

| #   | Exercise                      | Mental Model                                                                            |
| --- | ----------------------------- | --------------------------------------------------------------------------------------- |
| 01  | Closures & Reference Equality | Functions capture values. `===` compares references, not content                        |
| 02  | State Shape & Derived State   | If you can compute it during render, don't put it in state                              |
| 03  | State as Snapshot & Key Trick | Setting state doesn't change the variable -> each render is a snapshot                  |
| 04  | Refs — Non-rendering Values   | Refs are a "secret pocket" -> mutable, not tracked by React                             |
| 05  | What Effects Are Actually For | Effects synchronize with external systems and nothing else                              |
| 06  | Memoization Pitfalls          | Memoization is a performance optimization, not a correctness tool. Measure first        |
| 07  | DOM Refs & Imperative Handle  | Safe to read/mutate DOM in event handlers and effects, never during render              |
| 08  | Race Conditions & Cleanup     | When a component re-renders before an async response arrives, the response is stale     |
| 09  | Actions & the Action Prop     | Components own the transition, the optimistic state, and the pending UI                 |
| 10  | Suspense with `use()`         | Suspense says "this subtree is waiting. Show a fallback until it's ready"               |
| 11  | Error Boundaries              | Error boundaries catch rendering errors. They do NOT catch event handlers or async code |
| 12  | SSR & Hydration               | Server has no window. The first client render MUST match server output                  |

## Tooling

### React Scan — visualize re-renders

[React Scan](https://github.com/aidenybai/react-scan) highlights components as they re-render with colored outlines (frequency → color intensity). It's already loaded in `index.html`.

**Use in:** Exercises 2 (see double-render flash), 4 (see timer-driven cascade), 6 (see useless memos don't change render count), 9 (see transition keep input responsive).

### Render counter

Exercises 02, 05, and 06 include a built-in `useRenderCount()` hook that displays a red badge with the current render count. This makes unnecessary re-renders immediately visible: participants can see the number drop when they fix the anti-pattern.

### React DevTools Profiler

For Exercise 06 (memoization) specifically, teach students to use:

1. "Highlight updates when components render" toggle
2. Profiler flamegraph to see which components re-rendered
3. "Why did this render?" tooltip

Note: `StrictMode` is intentionally disabled. Its double-invocation in dev mode makes the render counters misleading.

## Reference Material

### Foundational

- [A Complete Guide to useEffect — Dan Abramov](https://overreacted.io/a-complete-guide-to-useeffect/) the mental model for closures, snapshots, and effects that underpins this entire workshop

### React Official Docs

- [react.dev/learn](https://react.dev/learn) the interactive React docs
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

- [react.gg/visualized](https://react.gg/visualized) animated React concept visualizations
- [Joy of React](https://www.joyofreact.com/) Josh Comeau's interactive course
- [Epic React](https://www.epicreact.dev/) Kent C. Dodds' deep-dive course
- [React Scan](https://github.com/aidenybai/react-scan) render visualization overlay

### Reactivity Models (for context)

- [Fine-grained Reactivity — Solid docs](https://docs.solidjs.com/advanced-concepts/fine-grained-reactivity) contrast with React's coarse-grained model

## What Changed from v1

The original workshop had 18 days. This version consolidates to 12 exercises:

1. **Added Exercise 01** Closures & Reference Equality (predict-and-verify warm-up). Establishes the two foundational mental models before any React-specific exercises.
2. **Cut Day 8** (Debounced Search), folded the `previousValue` pattern into Exercise 04 (Refs)
3. **Cut old Exercise 06** (Events vs Effects), redundant with Exercise 05 (effects classification). The `pendingVariablesRef` pattern is mentioned in Exercise 05's discussion.
4. **Cut Day 11** (Relay Refetching), too library-specific. Replaced with Exercise 09 (Actions & Action Prop) covering modern React 19 patterns
5. **Merged Days 17+18** (SSR + Hydration) into one conceptual unit, trimmed to 2 sub-exercises
6. **Cut Dependency Contract, Custom Hooks, and Compound Components**, focused on learn & experience over practice exercises
7. **Added build-from-scratch exercises** (07, 08, 09), participants implement from interfaces rather than just fixing bugs
8. **Added render counters**. `useRenderCount()` shows live render counts in exercises where the problem is unnecessary re-renders
9. **Removed StrictMode**, its double-invocation in dev mode made render counters misleading
10. **Upgraded Exercise 02C** from manual optimistic override to `useOptimistic`
11. **Upgraded Exercise 10** from hand-rolled `createResource` to the `use()` hook
12. **Added Exercise 09**, a new exercise covering `useTransition`, `useOptimistic`, `useActionState`, and the action prop pattern
13. **Added dynamic exercise loading**. `?ex=01` loads any exercise without changing `App.tsx`
