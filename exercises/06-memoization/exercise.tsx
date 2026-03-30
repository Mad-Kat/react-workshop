/**
 * Exercise 07: Memoization Pitfalls
 * ===================================
 *
 * Mental model: Memoization is a performance optimization, not a correctness
 * tool. The rule: measure first, memoize second.
 *
 * >> INSTRUCTOR: React Compiler (v1.0, Oct 2025) auto-memoizes components and
 * >> hooks at build time — manual useMemo/useCallback/React.memo becomes
 * >> optional. The goal of this exercise shifts: understand WHY these patterns
 * >> are wrong (unnecessary work, broken deps, unstable references) rather
 * >> than just learning the correct memo syntax. The compiler fixes perf, but
 * >> these bugs still indicate confused thinking about React's render model.
 *
 * This file has six performance-related problems. Problems 1–5 are
 * memoization pitfalls — classify each: remove, fix, or move out.
 * Problem 6 is about useDeferredValue — a declarative alternative to
 * debouncing expensive re-renders.
 *
 * Tip: Open React DevTools Profiler while working on Problem 5 to see
 * which components re-render and how long they take.
 *
 * Key reading: https://react.dev/reference/react/useMemo
 *
 * These are patterns found in our codebase.
 */

import type { FunctionComponent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRenderCount } from "../useRenderCount";
import { RenderCount } from "../RenderCount";

// ---------------------------------------------------------------------------
// Part A: Recipe Feed with four memoization problems
//
// Problem 1: useMemo on a trivial ternary
// Problem 2: useMemo with an unstable dependency (function recreated every render)
// Problem 3: useMemo wrapping Boolean() cast
// Problem 4: useCallback with a state dependency — consider whether the function
//            even needs to be memoized, or whether you can restructure to avoid
//            the dependency entirely.
// ---------------------------------------------------------------------------

interface Recipe {
  id: string;
  title: string;
  durationMinutes: number;
  cuisine: string;
  isFeatured: boolean;
}

type DisplayMode = "card" | "row";

const CardView: FunctionComponent<{ recipe: Recipe }> = ({ recipe }) => (
  <div className="card-view">
    {recipe.title} — {recipe.durationMinutes} min
  </div>
);

const RowView: FunctionComponent<{ recipe: Recipe }> = ({ recipe }) => (
  <div className="row-view">
    {recipe.title} — {recipe.durationMinutes} min
  </div>
);

export const RecipeFeed: FunctionComponent<{
  recipes: Recipe[];
  displayMode: DisplayMode;
  isExpanded: boolean | undefined;
}> = ({ recipes, displayMode, isExpanded }) => {
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Problem 1: useMemo on a trivial ternary
  // A single if/else returning a constant — zero computation to cache
  const RecipeComponent = useMemo(() => {
    if (displayMode === "card") {
      return CardView;
    } else {
      return RowView;
    }
  }, [displayMode]);

  // Problem 2: useMemo with unstable dependency
  // `formatDuration` is a plain function recreated every render
  // so this useMemo re-runs every render — caching nothing
  const formatDuration = (minutes: number) =>
    `${Math.floor(minutes / 60)}h ${minutes % 60}min`;

  const annotatedRecipes = useMemo(
    () =>
      recipes.map((r) => ({
        ...r,
        displayDuration: formatDuration(r.durationMinutes),
      })),
    [recipes, formatDuration], // formatDuration is new every render!
  );

  // Problem 3: useMemo wrapping Boolean() cast
  // The most trivial computation possible
  const isContentExpanded = useMemo(() => Boolean(isExpanded), [isExpanded]);

  // Problem 4: useCallback with a state dependency
  // The function uses `sortDirection` from state, but consider whether
  // memoizing it is necessary at all. Can you restructure to avoid it?
  const sortByDuration = useCallback(
    (a: Recipe, b: Recipe) =>
      sortDirection === "asc"
        ? a.durationMinutes - b.durationMinutes
        : b.durationMinutes - a.durationMinutes,
    [sortDirection],
  );

  const sorted = [...annotatedRecipes].sort(sortByDuration);

  return (
    <div>
      <button
        onClick={() => setSortDirection((d) => (d === "asc" ? "desc" : "asc"))}
      >
        Sort {sortDirection === "asc" ? "↓" : "↑"}
      </button>

      {isContentExpanded && <p>Showing expanded view</p>}

      {sorted.map((recipe) => (
        <RecipeComponent key={recipe.id} recipe={recipe} />
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Part B: ItemCard list — Problems 5 & 6
//
// Problem 5: React.memo trap — an inline object prop breaks memoization
//
// The parent re-renders every second (a timer). ItemCard is artificially
// expensive. React.memo has been applied to prevent unnecessary re-renders,
// but one card still re-renders every time. Why?
//
// Hint: look at the `style` prop passed to each ItemCard.
//
// Problem 6: No deferred rendering — search input blocked by expensive list
//
// A search filter re-renders all ItemCards synchronously on every keystroke,
// causing input lag. Fix: useDeferredValue on the search term so the input
// stays responsive while the expensive list renders at lower priority.
//
// Key reading: https://react.dev/reference/react/useDeferredValue
// ---------------------------------------------------------------------------

interface Item {
  id: string;
  name: string;
  category: string;
}

// Artificially expensive card — simulates a slow component
// In real code this could be a card with complex layout or many children
const ItemCard: FunctionComponent<{
  item: Item;
  style?: React.CSSProperties;
}> = ({ item, style }) => {
  const renderCount = useRenderCount();

  // Simulate expensive render work
  const end = performance.now() + 8;
  while (performance.now() < end) {
    // deliberate busy-wait
  }

  return (
    <div style={style} className="item-card">
      <strong>{item.name}</strong>
      <span>{item.category}</span>
      <RenderCount count={renderCount} />
    </div>
  );
};

// TODO: Cards re-render every second even though their props haven't changed.
// Fix this so only truly changed cards re-render.

const ITEMS: Item[] = [
  { id: "1", name: "Running Shoes", category: "Footwear" },
  { id: "2", name: "Yoga Mat", category: "Fitness" },
  { id: "3", name: "Water Bottle", category: "Accessories" },
  { id: "4", name: "Resistance Band", category: "Fitness" },
];

export const ItemList: FunctionComponent = () => {
  const [tick, setTick] = useState(0);
  const [search, setSearch] = useState("");

  // Re-renders the parent every second — this should NOT cause ItemCard to re-render
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Problem 6: filtering with raw search state — every keystroke triggers
  // a synchronous re-render of all expensive ItemCards, blocking the input.
  // Fix: use useDeferredValue(search) and filter on the deferred value instead.
  const filteredItems = ITEMS.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <p>Timer: {tick}s — watch the render counts on each card</p>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search items..."
      />

      {filteredItems.map((item, index) => (
        <ItemCard
          key={item.id}
          item={item}
          // Problem 5: this inline object is new on every render.
          // Even after wrapping in React.memo, this card will still re-render
          // every second because the `style` prop reference changes each time.
          // Fix: extract this object to a module-level or component-level constant.
          style={
            index === 0 ? { border: "1px solid red" } : undefined
          }
        />
      ))}
    </div>
  );
};
