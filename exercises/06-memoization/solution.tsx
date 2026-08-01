/**
 * Exercise 06: Memoization Pitfalls — SOLUTIONS
 * ================================================
 */

import type { FunctionComponent } from "react";
import { memo, useDeferredValue, useEffect, useState } from "react";
import { useRenderCount } from "../useRenderCount";
import { RenderCount } from "../RenderCount";

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
const formatDuration = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}min`;

// Fix 4: extract two module-level comparators and select via a ternary inside
// the component. No useCallback needed — a plain ternary is zero-cost.
const sortAsc = (a: Recipe, b: Recipe) => a.durationMinutes - b.durationMinutes;
const sortDesc = (a: Recipe, b: Recipe) => b.durationMinutes - a.durationMinutes;

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
      <button onClick={() => setSortDirection((d) => (d === "asc" ? "desc" : "asc"))}>
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

// Fix 5: ItemCard is already wrapped in React.memo (see exercise file). The fix is
// extracting the inline style object to a stable reference — see FEATURED_CARD_STYLE below.
const ItemCard = memo<{
  item: Item;
  style?: React.CSSProperties;
}>(({ item, style }) => {
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
  const [search, setSearch] = useState("");

  // Fix 6: useDeferredValue keeps the input responsive. React renders with
  // the old deferred value first (instant), then re-renders with the new
  // value at lower priority. If the user types again before the deferred
  // render finishes, React abandons that render and starts over — the input
  // never blocks.
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Filter uses the deferred value — expensive cards re-render at low priority
  const filteredItems = ITEMS.filter((item) =>
    item.name.toLowerCase().includes(deferredSearch.toLowerCase()),
  );

  return (
    <div>
      <p>Timer: {tick}s — render counts on cards should stay at 1</p>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search items..."
      />

      {filteredItems.map((item, index) => (
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

// ---------------------------------------------------------------------------
// Key takeaway
//   Memoization is a performance tool, not a correctness tool. A memo that
//   doesn't prevent a re-render is pure cost: the dependency has to be stable
//   and the child has to be genuinely expensive. Measure first.
// ---------------------------------------------------------------------------
