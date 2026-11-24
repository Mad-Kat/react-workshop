import { useState, useSyncExternalStore } from "react";
import {
  CancellableProductSearch,
  ProductSearch,
} from "../../exercises/08-race-conditions/solution.tsx";
import {
  getSearchStats,
  resetSearchStats,
  subscribeToSearchStats,
} from "../../exercises/08-race-conditions/api.ts";

const hintStyle = { fontSize: 12, color: "#999" };

function SearchStats() {
  const stats = useSyncExternalStore(subscribeToSearchStats, getSearchStats);
  return (
    <p>
      Searches sent: <strong>{stats.sent}</strong> · answered: <strong>{stats.answered}</strong> ·
      aborted: <strong>{stats.aborted}</strong>{" "}
      <button onClick={resetSearchStats}>Reset counters</button>
    </p>
  );
}

export default function Wrapper() {
  const [showCancellable, setShowCancellable] = useState(true);

  return (
    <>
      <p style={hintStyle}>
        The counters cover both parts. Reset them before you try the other one.
      </p>
      <SearchStats />
      <h2>A: Product Search</h2>
      <p style={hintStyle}>
        Type "shoes" quickly (don't paste it), then keep watching the list for two seconds.
      </p>
      <ProductSearch />
      <h2>B: Cancellable Product Search</h2>
      <p style={hintStyle}>
        Type "shoes" quickly and compare the counters with A. Then type "s" and hide the search
        before its results arrive.
      </p>
      <button onClick={() => setShowCancellable((show) => !show)}>
        {showCancellable ? "Hide" : "Show"} search
      </button>
      {showCancellable && <CancellableProductSearch />}
    </>
  );
}
