# Exercise 15 — Discussion Notes (10 min)

Use these after the exercise to open the conversation toward where React is heading.

## RSC & Streaming

Our codebase uses Next.js Pages Router — no React Server Components yet. But understanding RSC prepares for the App Router migration and clarifies why hydration patterns still matter.

**React Server Components:**
- Server Components run ONLY on the server — they never hydrate, never ship JS to the client, and have direct access to databases and file systems.
- Client Components are marked with `"use client"` and follow the same two-pass model from this exercise. All four patterns (useSyncExternalStore, typeof window, static-first, null→boolean) still apply.
- RSC = "virtual DOM over the network": the server serializes the component tree as a JSON-like payload and streams it to the client.

**Streaming SSR with Suspense:**
- Instead of waiting for the full page before sending HTML, Suspense boundaries let the server flush completed sections progressively. Shell (nav, header) first; slow data sections later.
- This is how Next.js App Router achieves fast TTFBs on data-heavy pages.

**The key distinction:**
> "Server Components never hydrate. Client Components always do."

Everything in this exercise lives in Client Components. RSC doesn't remove the problem — it moves it to a smaller, explicitly-marked surface.

## `<ViewTransition>` (React 19 experimental)

React introduces `<ViewTransition>` for smooth async UI transitions using the browser View Transitions API. It wraps state updates that change what's on screen, giving the browser a chance to animate between old and new states — no custom animation code required.

Triggers: `startTransition()`, `useDeferredValue()`, `<Suspense>` fallback transitions.

## `<Activity>` (React 19.2)

Declaratively hide/show parts of UI while preserving component state. Modes: `visible` (normal), `hidden` (unmounts effects, defers updates). Use case: pre-render next page off-screen, preserve state during navigation.

## Reference

- https://www.joshwcomeau.com/react/server-components/
- https://react.dev/blog/2025/04/23/react-labs-view-transitions-activity-and-more
