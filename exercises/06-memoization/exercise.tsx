/**
 * Exercise 06: Memoization Pitfalls
 * ===================================
 *
 * Mental model: Memoization is a performance optimization, not a correctness
 * tool. The rule: measure first, memoize second.
 *
 * Tip: the React DevTools Profiler shows which components rendered and how
 * long each one took.
 *
 * Key reading: https://react.dev/reference/react/useMemo
 */

import type { FunctionComponent } from "react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useRenderCount } from "../useRenderCount";
import { RenderCount } from "../RenderCount";

// ---------------------------------------------------------------------------
// Exercise A: Recipe Feed
//
// `RecipeFeed` lists recipes as cards or rows, sorted by duration, with a
// button that flips the sort direction. Every useMemo and useCallback in it
// was added "for performance".
//
// Go through them one by one. For each, work out whether it saves any work
// at all, and whether that work is worth saving.
//
// Done when:
//   - every useMemo and useCallback left in RecipeFeed skips real work on a
//     re-render, and you can say what that work is
//   - the feed looks and sorts exactly as before
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

  const RecipeComponent = useMemo(() => {
    if (displayMode === "card") {
      return CardView;
    } else {
      return RowView;
    }
  }, [displayMode]);

  const formatDuration = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}min`;

  const annotatedRecipes = useMemo(
    () =>
      recipes.map((r) => ({
        ...r,
        displayDuration: formatDuration(r.durationMinutes),
      })),
    [recipes, formatDuration],
  );

  const isContentExpanded = useMemo(() => Boolean(isExpanded), [isExpanded]);

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
// Exercise B: Item List
//
// `ItemList` filters a short list of cards by a search term and highlights
// the match in each card. A timer above the list ticks once a second.
// `ItemCard` is deliberately slow to render.
//
// Run it. Watch the render badges while the timer ticks, then type quickly
// into the search box.
//
// Done when:
//   - no card renders when the timer ticks
//   - what you type shows up in the search box right away, even if the
//     list needs a moment to catch up
//   - filtering and highlighting still work
//   - `ItemCard` is still as slow as it is now: making it faster doesn't
//     count
//
// Key reading: https://react.dev/reference/react/useDeferredValue
// ---------------------------------------------------------------------------

interface Item {
  id: string;
  name: string;
  category: string;
}

// Wraps the part of `text` that matches `query` in <mark>
const highlightMatch = (text: string, query: string) => {
  const start = text.toLowerCase().indexOf(query.toLowerCase());
  if (!query || start === -1) return text;
  const end = start + query.length;
  return (
    <>
      {text.slice(0, start)}
      <mark>{text.slice(start, end)}</mark>
      {text.slice(end)}
    </>
  );
};

const ItemCard = memo<{
  item: Item;
  query: string;
  style?: React.CSSProperties;
}>(({ item, query, style }) => {
  const renderCount = useRenderCount();

  // Simulate expensive render work
  const end = performance.now() + 200;
  while (performance.now() < end) {
    // deliberate busy-wait
  }

  return (
    <div style={style} className="item-card">
      <strong>{highlightMatch(item.name, query)}</strong>
      <span>{item.category}</span>
      <RenderCount count={renderCount} />
    </div>
  );
});

ItemCard.displayName = "ItemCard";

const ITEMS: Item[] = [
  { id: "1", name: "Running Shoes", category: "Footwear" },
  { id: "2", name: "Yoga Mat", category: "Fitness" },
  { id: "3", name: "Water Bottle", category: "Accessories" },
  { id: "4", name: "Resistance Band", category: "Fitness" },
];

export const ItemList: FunctionComponent = () => {
  const [tick, setTick] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

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
          query={search}
          style={index === 0 ? { border: "1px solid red" } : undefined}
        />
      ))}
    </div>
  );
};
