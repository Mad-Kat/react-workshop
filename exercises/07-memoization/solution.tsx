/**
 * Exercise 07: Memoization Pitfalls — SOLUTIONS
 * ================================================
 */

import type { FunctionComponent } from "react";
import { memo, useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Part A: Recipe Feed
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

// Fix 2 + Fix 4: move pure utilities outside the component
// They don't read any props or state — they belong at module scope
const formatDuration = (minutes: number) =>
  `${Math.floor(minutes / 60)}h ${minutes % 60}min`;

// Fix 4: extract two module-level comparators and select via a ternary inside
// the component. No useCallback needed — a plain ternary is zero-cost.
const sortAsc = (a: Recipe, b: Recipe) =>
  a.durationMinutes - b.durationMinutes;
const sortDesc = (a: Recipe, b: Recipe) =>
  b.durationMinutes - a.durationMinutes;

export const RecipeFeed: FunctionComponent<{
  recipes: Recipe[];
  displayMode: DisplayMode;
  isExpanded: boolean | undefined;
}> = ({ recipes, displayMode, isExpanded }) => {
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Fix 1: just a ternary — no useMemo needed
  const RecipeComponent = displayMode === "card" ? CardView : RowView;

  // Fix 2: formatDuration moved outside; inline the map
  // (no useMemo needed for a simple .map() on a small list)
  const annotatedRecipes = recipes.map((r) => ({
    ...r,
    displayDuration: formatDuration(r.durationMinutes),
  }));

  // Fix 3: just inline the Boolean cast — no useMemo needed
  const isContentExpanded = Boolean(isExpanded);

  // Fix 4: select the comparator via a ternary — no useCallback, no deps array
  const comparator = sortDirection === "asc" ? sortAsc : sortDesc;
  const sorted = [...annotatedRecipes].sort(comparator);

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
// Part B: ItemCard list with React.memo
// ---------------------------------------------------------------------------

interface Item {
  id: string;
  name: string;
  category: string;
}

// Fix 5 (part a): wrap ItemCard in React.memo so the parent timer does not
// cause re-renders when props are unchanged
const ItemCard = memo<{
  item: Item;
  style?: React.CSSProperties;
}>(({ item, style }) => {
  // Simulate expensive render work
  const end = performance.now() + 8;
  while (performance.now() < end) {
    // deliberate busy-wait
  }

  return (
    <div style={style} className="item-card">
      <strong>{item.name}</strong>
      <span>{item.category}</span>
    </div>
  );
});

ItemCard.displayName = "ItemCard";

// Fix 5 (part b): extract the inline style object to a module-level constant.
// An inline object literal like `{ border: "1px solid red" }` creates a new
// reference on every render, so React.memo's shallow comparison always sees
// a changed prop and bails out of the optimization.
const FEATURED_CARD_STYLE: React.CSSProperties = { border: "1px solid red" };

const ITEMS: Item[] = [
  { id: "1", name: "Running Shoes", category: "Footwear" },
  { id: "2", name: "Yoga Mat", category: "Fitness" },
  { id: "3", name: "Water Bottle", category: "Accessories" },
  { id: "4", name: "Resistance Band", category: "Fitness" },
];

export const ItemList: FunctionComponent = () => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <p>Timer: {tick}s — open Profiler to confirm no cards re-render</p>

      {ITEMS.map((item, index) => (
        <ItemCard
          key={item.id}
          item={item}
          // Stable reference — React.memo's shallow comparison now works
          style={index === 0 ? FEATURED_CARD_STYLE : undefined}
        />
      ))}
    </div>
  );
};

/**
 * Summary of fixes:
 *
 * 1. useMemo on ternary → removed. A ternary returning a constant component
 *    reference is zero-cost. useMemo adds overhead for no benefit.
 *
 * 2. useMemo with unstable dep → removed. `formatDuration` was recreated
 *    every render, so the memo never cached. Moved the function outside.
 *
 * 3. useMemo wrapping Boolean() → removed. `Boolean(x)` is the cheapest
 *    possible computation — memoizing it costs more than computing it.
 *
 * 4. useCallback with state dependency → restructured. Instead of capturing
 *    `sortDirection` inside a memoized callback, extract two module-level
 *    comparators and select between them with a ternary. The ternary itself
 *    is trivial; no memoization required.
 *
 * 5. React.memo trap → inline object extracted to a module-level constant.
 *    React.memo uses shallow equality on props. An inline object literal is
 *    a new reference every render, so memo never skips re-renders for that
 *    prop. Always hoist stable objects/arrays/functions outside the component
 *    (or use useMemo/useCallback when they depend on props/state).
 *
 * When IS memoization correct?
 * - useMemo on a context value to prevent all consumers re-rendering
 * - useCallback on a function passed to React.memo'd children
 * - React.memo on a genuinely expensive component with stable props
 * - useMemo on genuinely expensive computations (1000+ items, profiler confirms)
 *
 * Real codebase references:
 *   - libraries/product-list/src/productListSerp.tsx: cheap ternary in useMemo
 *   - domains/product-detail/src/blocks/lib/expandableContentWrapper.tsx: incomplete useCallback deps
 */
