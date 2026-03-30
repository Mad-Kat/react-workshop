# Instructor Reference — Original Codebase Sources

This file maps each workshop exercise back to the real codebase file it was derived from. **Do not share this file with participants.**

---

## Exercise 01: Closures & Reference Equality (NEW)

No codebase source — this is a foundational mental model exercise.

| Exercise | Concept | React Connection |
|----------|---------|-----------------|
| A — Closures | Functions capture variables; `var` vs `let` scoping; setTimeout snapshots | Each render creates new `const` bindings. Closures (event handlers, effects) capture that render's values. `useRef` is the escape hatch for mutable `let` behavior. |
| B — Reference Equality | `===` compares references for objects/arrays/functions; primitives compare by value | React's dependency arrays use `Object.is()`. Inline objects/functions are new references every render → effects re-run, memo breaks. |

**Key pre-reading:** [A Complete Guide to useEffect — Dan Abramov](https://overreacted.io/a-complete-guide-to-useeffect/) — the "Each Render Has Its Own..." sections establish the closure mental model that underpins the entire workshop.

**Discussion points:**
- Why does React use `const` for state instead of `let`? (Immutability within a render prevents bugs)
- What happens if you put a `useRef` value in a dependency array? (It's always the same reference — the effect never re-runs from it)
- Why doesn't React do deep equality checks on deps? (Performance — deep comparison is O(n), reference check is O(1))

---

## Exercise 02: State Shape & Derived State

| Exercise | Anti-Pattern | Original File |
|----------|-------------|---------------|
| A — Weather Status Badge | State mirroring prop via effect, setState during render | `libraries/product-availability/src/availabilityLegacy.tsx` (lines 160–161, 181–199) |
| B — Notification Preference | State mirroring Relay data, optimistic update → `useOptimistic` | `libraries/product-updates-notifications/src/productDetailPage/useSubscribeToPriceChange.tsx` (lines 54–78) |

**Note:** Exercise includes `useRenderCount()` — participants can see the render count drop when they remove the effect and derive inline.

---

## Exercise 03: State as Snapshot & Key Trick

| Exercise | Anti-Pattern | Original File |
|----------|-------------|---------------|
| A — Font Size Picker | Effect-based reset on prop change | `domains/archived-orders/src/overview/datePicker.tsx` |
| B — Notification Settings Dialog | Editable copy pattern with effect sync | `domains/cookie-compliance/src/settings/dialog/useCookieSettingsHelper.tsx` (lines 65, 186–188) |

Also referenced: `segments/carousel-solo-slide/src/carousel.tsx` (lines 31–49) — controlled/uncontrolled hybrid

**Note:** Wrapper includes "Simulate external update" button so participants can see the effect-based reset wipe their edits (exercise) vs the key trick remounting cleanly (solution).

---

## Exercise 04: Refs — Non-rendering Values

| Exercise | Anti-Pattern | Original File |
|----------|-------------|---------------|
| A — Weather Station Poller | isFetching in state (should be ref), timer IDs in state | `domains/dutch-auction/src/auctionEvent/useAuctionStateUpdater.ts` (lines 63–101) |
| B — Debounced Search | previousSearchTerm tracked via effect (one render behind), timerId in state, searchCount in state | Composite pattern from multiple files |

Also referenced:
- `libraries/product-updates-notifications/src/productDetailPage/useSubscribeToPriceChange.tsx` (lines 58–73) — didRetryRef guard
- `domains/spending/src/spending.tsx` (lines 140–143) — refetchVariablesRef, hasRestoredPeriodId

---

## Exercise 05: What Effects Are Actually For

| Exercise | Classification | Original File |
|----------|---------------|---------------|
| A — totalRate derivation | Should be inline derivation | `libraries/discussions/src/components/hooks/useDiscussionDetailPostData.tsx` (line 21) |
| B — analytics on confirm | Should be in event handler | `libraries/product-updates-notifications/src/productDetailPage/useSubscribeToPriceChange.tsx` (line 80) |
| C — occupancy subscription | Legitimate effect | `domains/dutch-auction/src/auctionEvent/useAuctionStateUpdater.ts` (lines 103–119) |
| D — keyboard shortcut | Legitimate effect | `domains/dutch-auction/src/auctionEvent/useAuctionStateUpdater.ts` (lines 121–135) |

**Note:** Exercise includes `useRenderCount()` + fetch counter. The old Exercise 06 (Events vs Effects) was removed as redundant — Effect B here already teaches "this should be in an event handler." For advanced teams, mention the `pendingVariablesRef` pattern from `domains/spending/src/spending.tsx` during discussion.

---

## Exercise 06: Memoization Pitfalls

| Exercise | Anti-Pattern | Original File |
|----------|-------------|---------------|
| Problem 1 — cheap ternary in useMemo | useMemo wrapping trivial if/else | `libraries/product-list/src/productListSerp.tsx` (lines 186–192) |
| Problem 2 — unstable dep in useMemo | Inline function in useMemo deps | `segments/carousel-solo-slide/src/carousel.tsx` (lines 51–78) |
| Problem 3 — Boolean() in useMemo | useMemo wrapping Boolean() cast | `domains/product-detail/src/blocks/blockStates/blockStatesContext.tsx` (lines 47–52, 70–75) |
| Problem 4 — useCallback with state dep | useCallback that can be restructured to avoid the dependency | `domains/product-detail/src/blocks/lib/expandableContentWrapper.tsx` (lines 69–101) |
| Problem 5 — React.memo with unstable props | React.memo defeated by inline object prop | Generic pattern (common in component libraries) |

**Note:** Problem 5 (Part B) includes `useRenderCount()` on each `ItemCard`. Exercise: all 4 card counters increment every second. Solution: card counters stay at 1. This is the most visually dramatic exercise.

---

## Exercise 07: DOM Refs & the Safe Mutation Window

| Exercise | Pattern | Original File |
|----------|---------|---------------|
| A — FancyInput | ref as prop (React 19) + useImperativeHandle | `libraries/community-comment-form/src/communityCommentForm.tsx` |
| B — ScrollSafeInput | Ref callback with cleanup return (React 19) | `blocks/form/src/components/inputField/inputField.tsx` |

**Format:** Build from scratch. Participants are given the parent component that calls `ref.focus()` and `ref.clear()`, and must implement `FancyInput` with `useImperativeHandle`.

---

## Exercise 08: Race Conditions & Cleanup

| Exercise | Pattern | Original File |
|----------|---------|---------------|
| A — useProductSearch (ignore flag) | Cleanup function sets `ignore = true` | `domains/dutch-auction/src/auctionEvent/useAuctionStateUpdater.ts` (polling/cleanup) |
| B — useProductSearchWithAbort | AbortController for proper cancellation | Same pattern, with signal support |

**Format:** Build from scratch. Participants are given the search API and consumer component, and must implement the hooks with proper cleanup.

Also referenced: `libraries/cart/src/sidebar/lazy/shoppingCartSidebarContent.tsx` — Relay auto-management of race conditions

---

## Exercise 09: Actions & the Action Prop

| Exercise | Pattern | Codebase Connection |
|----------|---------|---------------------|
| A — Todo List (manual) | Manual isPending/error/optimistic state | Anti-pattern version of common mutation handling (study only) |
| B — Todo List (actions) | useTransition + useOptimistic + form action prop | `libraries/product-list/src/productListSerp.tsx` (useTransition for refetch) |
| C — Like Button | useActionState for sequential actions | `libraries/product-updates-notifications/src/productDetailPage/useSubscribeToPriceChange.tsx` (mutation pattern) |

**Format:** Build from scratch. Exercise A is study-only reference material. Participants implement B and C.

External references:
- [Aurora Scharff — Action Props Pattern](https://aurorascharff.no/posts/building-design-components-with-action-props-using-async-react/)
- [Async React demo — React Conf 2025](https://github.com/rickhanlonii/async-react)
- [Async React Working Group](https://github.com/reactwg/async-react/discussions/2)

---

## Exercise 10: Suspense with use()

| Exercise | Pattern | Original File |
|----------|---------|---------------|
| Manual → Suspense conversion | use() + Suspense + ErrorBoundary composition | `segments/relay/src/data/lazyLoadQueryBoundary.tsx` |
| | ClientSideRender | `blocks/client-side-render/src/clientSideRender.tsx` |
| | lazy() with preloading | `blocks/lazy/src/lazy.tsx` |

---

## Exercise 11: Error Boundaries

| Exercise | Pattern | Original File |
|----------|---------|---------------|
| Product detail with isolated sections | Symbol-based handler matching | `segments/error-boundary/src/errorBoundary.tsx` |
| | throwErrorHandler | `libraries/product-list/src/productListSerp.tsx` (line 156) |
| | Dual context for block isolation | `domains/product-detail/src/blocks/blockStates/blockStatesContext.tsx` |
| | useErrorHandler | `segments/error-boundary/src/useErrorHandler.ts` |

---

## Exercise 12: SSR & Hydration

| Exercise | Pattern | Original File |
|----------|---------|---------------|
| A — ResponsiveLayout | useSyncExternalStore with getServerSnapshot | `blocks/client-side-render/src/clientSideRender.tsx` |
| B — ThemeSelector | typeof window guard | `domains/spending/src/spending.tsx` (line 32) |

Also referenced:
- `blocks/client-side-render/src/useIsHydrated.ts` — useIsHydrated pattern
- `segments/relay/src/data/lazyLoadQueryBoundary.tsx` — forceLoadingFallback prop

**Note:** Trimmed from 4 sub-exercises to 2. Post (Date.now mismatch) and AdaptiveCard (matchMedia) removed — they're variants of the same patterns. SSR issues can't be visually tested client-side; the exercise is conceptual.

**Discussion topics:** React Server Components, Streaming SSR, `<ViewTransition>` component.
