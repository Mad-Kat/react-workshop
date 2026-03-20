# Instructor Reference — Original Codebase Sources

This file maps each workshop exercise back to the real codebase file it was derived from. **Do not share this file with participants.**

---

## Exercise 01: State Shape & Derived State

| Exercise | Anti-Pattern | Original File |
|----------|-------------|---------------|
| A — Weather Status Badge | State mirroring prop via effect, setState during render | `libraries/product-availability/src/availabilityLegacy.tsx` (lines 160–161, 181–199) |
| B — Task Note Editor | `displayedText` state mirrors `text` prop | `libraries/discussions/src/components/discussionDetailPost.tsx` (lines 71–77) |
| C — Notification Preference | State mirroring Relay data, optimistic update → `useOptimistic` | `libraries/product-updates-notifications/src/productDetailPage/useSubscribeToPriceChange.tsx` (lines 54–78) |

**Note:** Old Exercise C (LocalizedProfileContent) was dropped — too similar to Exercise A. Old Exercise D became new Exercise C, now solved with `useOptimistic` instead of manual `optimisticOverride ?? serverEnabled`.

---

## Exercise 02: State as Snapshot & the Key Trick

| Exercise | Anti-Pattern | Original File |
|----------|-------------|---------------|
| A — Font Size Picker | Effect-based reset on prop change | `domains/archived-orders/src/overview/datePicker.tsx` |
| B — Notification Settings Dialog | Editable copy pattern with effect sync | `domains/cookie-compliance/src/settings/dialog/useCookieSettingsHelper.tsx` (lines 65, 186–188) |
| C — Stale Closure Demo | setTimeout capturing stale count | Generic pattern (no specific file) |

Also referenced: `segments/carousel-solo-slide/src/carousel.tsx` (lines 31–49) — controlled/uncontrolled hybrid

---

## Exercise 03: Refs — Non-rendering Values

| Exercise | Anti-Pattern | Original File |
|----------|-------------|---------------|
| A — Weather Station Poller | isFetching in state (should be ref), timer IDs in state | `domains/dutch-auction/src/auctionEvent/useAuctionStateUpdater.ts` (lines 63–101) |
| B — Debounced Search | previousSearchTerm tracked via effect (one render behind), timerId in state, searchCount in state | Composite pattern from multiple files |

Also referenced:
- `libraries/product-updates-notifications/src/productDetailPage/useSubscribeToPriceChange.tsx` (lines 58–73) — didRetryRef guard
- `domains/spending/src/spending.tsx` (lines 140–143) — refetchVariablesRef, hasRestoredPeriodId

**Note:** Old Day 8 (Debounced Search standalone) merged into this exercise as Exercise B.

---

## Exercise 04: What Effects Are Actually For

| Exercise | Classification | Original File |
|----------|---------------|---------------|
| A — totalRate derivation | Should be inline derivation | `libraries/discussions/src/components/hooks/useDiscussionDetailPostData.tsx` (line 21) |
| B — analytics on confirm | Should be in event handler | `libraries/product-updates-notifications/src/productDetailPage/useSubscribeToPriceChange.tsx` (line 80) |
| C — occupancy subscription | Legitimate effect | `domains/dutch-auction/src/auctionEvent/useAuctionStateUpdater.ts` (lines 103–119) |
| D — keyboard shortcut | Legitimate effect | `domains/dutch-auction/src/auctionEvent/useAuctionStateUpdater.ts` (lines 121–135) |

---

## Exercise 05: The Dependency Contract

| Exercise | Anti-Pattern | Original File |
|----------|-------------|---------------|
| A — Playlist context | useMemo with unstable function dep (selectTrack) | `segments/carousel-solo-slide/src/carousel.tsx` (lines 51–78) |
| B — Accordion Section | useCallback with 5 missing deps | `domains/product-detail/src/blocks/lib/expandableContentWrapper.tsx` (lines 69–101) |
| C — Activity Feed | Effect with object dep causing infinite loop | Generic pattern (no specific file) |

Also referenced:
- `segments/snowplow/src/context/trackingContext.tsx` (lines 27–35) — intentional dep suppression with mutation
- `segments/restore-render-height/src/restoreRenderHeightContext.tsx` (lines 37–56) — empty deps with router ref

---

## Exercise 06: Events vs Effects

| Exercise | Anti-Pattern | Original File |
|----------|-------------|---------------|
| Report Viewer Page | All refetch logic in effects instead of event handlers | `domains/spending/src/spending.tsx` (lines 138–241) |

The real file has: `refetchVariablesRef` pattern, `useRefetchableFragment`, URL hash restoration as legitimate effect, period/category changes as event handlers.

**Note:** Two-step approach added (Step 1: simple handler refetch, Step 2: pendingVariablesRef).

---

## Exercise 07: Memoization Pitfalls

| Exercise | Anti-Pattern | Original File |
|----------|-------------|---------------|
| Problem 1 — cheap ternary in useMemo | useMemo wrapping trivial if/else | `libraries/product-list/src/productListSerp.tsx` (lines 186–192) |
| Problem 2 — unstable dep in useMemo | Inline function in useMemo deps | `segments/carousel-solo-slide/src/carousel.tsx` (lines 51–78) |
| Problem 3 — Boolean() in useMemo | useMemo wrapping Boolean() cast | `domains/product-detail/src/blocks/blockStates/blockStatesContext.tsx` (lines 47–52, 70–75) |
| Problem 4 — useCallback with state dep | useCallback that can be restructured to avoid the dependency | `domains/product-detail/src/blocks/lib/expandableContentWrapper.tsx` (lines 69–101) |
| Problem 5 — React.memo with unstable props | React.memo defeated by inline object prop | Generic pattern (common in component libraries) |

**Note:** Problem 4 description fixed (original incorrectly said "doesn't use props/state"). Problem 5 is new.

---

## Exercise 08: DOM Refs & the Safe Mutation Window

| Exercise | Pattern | Original File |
|----------|---------|---------------|
| A — FancyInput | forwardRef + useImperativeHandle | `libraries/community-comment-form/src/communityCommentForm.tsx` |
| B — ScrollSafeInput | Ref callback for wheel event | `blocks/form/src/components/inputField/inputField.tsx` |

---

## Exercise 09: Race Conditions & Cleanup

| Exercise | Pattern | Original File |
|----------|---------|---------------|
| Product Search | Ignore flag + AbortController | `domains/dutch-auction/src/auctionEvent/useAuctionStateUpdater.ts` (polling/cleanup) |

Also referenced: `libraries/cart/src/sidebar/lazy/shoppingCartSidebarContent.tsx` — Relay auto-management of race conditions

---

## Exercise 10: Actions & the Action Prop (NEW)

| Exercise | Pattern | Codebase Connection |
|----------|---------|---------------------|
| A — Todo List (manual) | Manual isPending/error/optimistic state | Anti-pattern version of common mutation handling |
| B — Todo List (actions) | useTransition + useOptimistic + form action prop | `libraries/product-list/src/productListSerp.tsx` (useTransition for refetch) |
| C — Like Button | useActionState for sequential actions | `libraries/product-updates-notifications/src/productDetailPage/useSubscribeToPriceChange.tsx` (mutation pattern) |

External references:
- [Aurora Scharff — Action Props Pattern](https://aurorascharff.no/posts/building-design-components-with-action-props-using-async-react/)
- [Async React demo — React Conf 2025](https://github.com/rickhanlonii/async-react)
- [Async React Working Group](https://github.com/reactwg/async-react/discussions/2)

**Note:** This exercise replaces old Day 11 (Relay Refetching) and old Day 12 (useTransition), consolidating async React patterns into one exercise with modern primitives.

---

## Exercise 11: Suspense with use()

| Exercise | Pattern | Original File |
|----------|---------|---------------|
| Manual → Suspense conversion | use() + Suspense + ErrorBoundary composition | `segments/relay/src/data/lazyLoadQueryBoundary.tsx` |
| | ClientSideRender | `blocks/client-side-render/src/clientSideRender.tsx` |
| | lazy() with preloading | `blocks/lazy/src/lazy.tsx` |

**Note:** `createResource` (throw-promise pattern) replaced with React 19's `use()` hook.

---

## Exercise 12: Error Boundaries

| Exercise | Pattern | Original File |
|----------|---------|---------------|
| Product detail with isolated sections | Symbol-based handler matching | `segments/error-boundary/src/errorBoundary.tsx` |
| | throwErrorHandler | `libraries/product-list/src/productListSerp.tsx` (line 156) |
| | Dual context for block isolation | `domains/product-detail/src/blocks/blockStates/blockStatesContext.tsx` |
| | useErrorHandler | `segments/error-boundary/src/useErrorHandler.ts` |

---

## Exercise 13: Custom Hooks as Sync Units

| Exercise | Pattern | Original File |
|----------|---------|---------------|
| WebSocket → useWebSocket extraction | Full sync unit with connect/disconnect/reconnect | `domains/dutch-auction/src/auctionEvent/useAuctionStateUpdater.ts` |
| | Stable callback via ref | `segments/scroll/src/useScrollDirection.ts` |

**Note:** Visibility-aware reconnection dropped to reduce scope. Focus is on the extraction pattern.

---

## Exercise 14: Compound Components

| Exercise | Pattern | Original File |
|----------|---------|---------------|
| Disclosure (compound component) | Minimal context + state | `libraries/user-menu/src/components/standardUserMenu/userAccount/menuSections/hooks/accordion.tsx` |
| | "Must be inside parent" guard | `segments/carousel/src/carouselContext.tsx` |
| | Dual context (state + dispatch) | `domains/product-detail/src/blocks/blockStates/blockStatesContext.tsx` |

**Note:** Contexts and guard hooks provided as starter code. Students focus on component wiring.

---

## Exercise 15: SSR & Hydration

| Exercise | Pattern | Original File |
|----------|---------|---------------|
| A — ResponsiveLayout | useSyncExternalStore with getServerSnapshot | `blocks/client-side-render/src/clientSideRender.tsx` |
| B — ThemeSelector | typeof window guard | `domains/spending/src/spending.tsx` (line 32) |
| C — Post (relative time) | Date.now() mismatch → static first, update via effect | Generic pattern |
| D — AdaptiveCard | matchMedia mismatch → null→value pattern | `domains/spending/src/spending.tsx` (lines 48–58) — isMobileTablet null→boolean |

**Dropped:** Day 17C (UserGreeting — overlaps with Post), Day 18B (TipOfTheDay — niche deterministic seed)

Also referenced:
- `blocks/client-side-render/src/useIsHydrated.ts` — useIsHydrated pattern
- `segments/relay/src/data/lazyLoadQueryBoundary.tsx` — forceLoadingFallback prop

**Discussion topics:** React Server Components, Streaming SSR, `<ViewTransition>` component.
