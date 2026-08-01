# React Workshop

Internal workshop for engineers who work in our React codebase. You know React/JSX basics, write TypeScript daily, and have reviewed PRs. This is about the deeper mental models for React's render cycle, effects, and async primitives.

**Philosophy:** Rewire mental models, not teach syntax. Every exercise uses patterns, hooks, and anti-patterns from our actual codebase. You fix buggy or suboptimal code, build components from an interface, or predict behavior. You don't build from a blank slate. That mirrors real work and forces reading before writing.

**Format:** One exercise every second week. ~30 min hands-on + 15 min group discussion.

## How this repo works

**Exercises are released one at a time.** This branch (`main`) only ever contains what's been released. Open the StackBlitz link at the start of each session and the new exercise is simply there.

After each session, the walkthrough guide and the reference solution for that exercise are added here too. The exercises are built so the bug is _observable_, which means you can see the wrong render count, the stale value, the extra render. Reading the answer before you've watched the problem happen skips the part that actually rewires anything.

### Running it (StackBlitz)

**https://stackblitz.com/github/Mad-Kat/react-workshop**

Dependencies install and the dev server starts on their own. Use the exercise dropdown above the exercise to switch between exercises and (once released) their solutions.

Two things to know:

- Opening that link gives you a fresh copy of `main` every time. That's why the new exercise appears automatically each session.
- It also means your edits are not saved unless you fork the project into your own StackBlitz account (top-right) or download it. If you want to keep your work between sessions, fork it once and reuse your fork. Then pull in the new exercise, or just open the link fresh and re-fork.

### Running it locally instead

```bash
git clone git@github.com:Mad-Kat/react-workshop.git
```

```bash
npm install && npm run dev
```

Then `git pull` before each session. The dropdown works the same and you can also address an exercise directly at `http://localhost:5173/?ex=01`, or a released solution at `?ex=01-solution`.

### Where the files are

| Path                             | What it is                                          |
| -------------------------------- | --------------------------------------------------- |
| `exercises/NN-name/exercise.tsx` | The code you edit                                   |
| `exercises/NN-name/guide.md`     | Step-by-step walkthrough                            |
| `exercises/NN-name/solution.tsx` | Reference solution                                  |
| `src/wrappers/NN.tsx`            | Renders the exercise; you rarely need to touch this |

## Curriculum

```
Phase 1: Foundations & Mental Models           (Exercises 1–4)
Phase 2: Effects as Synchronization            (Exercise 5)
Phase 3: Memoization: The Last Resort          (Exercise 6)
Phase 4: Refs & the Imperative Boundary        (Exercise 7)
Phase 5: Async React                           (Exercises 8–11)
Phase 6: SSR & Hydration                       (Exercise 12)
```

Each phase assumes the previous. You can't reason about hydration mismatches (Exercise 12) before understanding that hooks run in both passes.

| #   | Exercise                      | Mental Model                                                                            |
| --- | ----------------------------- | --------------------------------------------------------------------------------------- |
| 01  | Closures & Reference Equality | Functions capture values. `===` compares references, not content                        |
| 02  | State Shape & Derived State   | If you can compute it during render, don't put it in state                              |
| 03  | State as Snapshot & Key Trick | Setting state doesn't change the variable —> each render is a snapshot                  |
| 04  | Refs — Non-rendering Values   | Refs are a "secret pocket" —> mutable, not tracked by React                             |
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

[React Scan](https://github.com/aidenybai/react-scan) outlines components as they re-render (frequency → color intensity). It's already loaded in `index.html`.

Most useful in exercises 2 (double render), 4 (timer-driven cascade), 6 (useless memos don't change render count), 9 (transition keeps input responsive).

### Render counter

Some exercises use a built-in `useRenderCount()` hook that shows a red badge with the current render count. That's the point of those exercises: watch the number drop when you fix the anti-pattern.

### React DevTools Profiler

For Exercise 06 (memoization) especially:

1. "Highlight updates when components render" toggle
2. Profiler flamegraph — which components re-rendered
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
