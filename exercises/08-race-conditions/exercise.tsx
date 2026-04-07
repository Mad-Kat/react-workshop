/**
 * Exercise 08: Race Conditions & Cleanup
 * ========================================
 *
 * Mental model: When a component fires an async request and re-renders
 * before the response arrives, the response is stale.
 *
 * If you get stuck, open guide.md for step-by-step thinking.
 *
 * Key reading: https://react.dev/learn/synchronizing-with-effects#fetching-data
 *
 * FORMAT: Build from scratch
 * You are given: the API, the hook interface, and the consumer component.
 * You implement: the useEffect body with proper cleanup.
 */

import type { FunctionComponent } from "react";
import { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// PROVIDED: Types and fake API (don't modify)
// ---------------------------------------------------------------------------

interface SearchResult {
  id: string;
  name: string;
  price: number;
}

// Simulates an API with random latency (50-500ms).
// Accepts an optional AbortSignal for cancellation.
const searchProducts = async (
  query: string,
  signal?: AbortSignal,
): Promise<SearchResult[]> => {
  const delay = Math.floor(Math.random() * 450) + 50;
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, delay);
    signal?.addEventListener("abort", () => {
      clearTimeout(timeout);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

  if (!query) return [];
  return [
    { id: `${query}-1`, name: `${query} sneakers`, price: 89.9 },
    { id: `${query}-2`, name: `${query} boots`, price: 149.9 },
    { id: `${query}-3`, name: `${query} sandals`, price: 49.9 },
  ];
};

// ---------------------------------------------------------------------------
// Exercise A: Implement useProductSearch (ignore flag approach)
//
// Build a hook that:
//   1. Fetches search results when the query changes
//   2. Returns [] when query is empty (without fetching)
//   3. Prevents stale responses from overwriting newer results
//
// Start by implementing WITHOUT cleanup — observe the flickering.
// Then add cleanup using an ignore flag.
//
// Questions to think about:
//   - Why does the cleanup function run when query changes?
//   - Each effect invocation creates its own `ignore` — why?
//   - What happens to isLoading when a stale response is ignored?
// ---------------------------------------------------------------------------

function useProductSearch(query: string): {
  results: SearchResult[];
  isLoading: boolean;
} {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // TODO: implement the effect with proper cleanup
  // Remember: the effect should handle the case where query is empty

  return { results, isLoading };
}

// ---------------------------------------------------------------------------
// Exercise B: Implement useProductSearchWithAbort (AbortController)
//
// Same goal as Exercise A, but actually cancel the in-flight request.
//
// Step 1: Create `new AbortController()` at the start of the effect
// Step 2: Pass `controller.signal` to searchProducts
// Step 3: In cleanup, call `controller.abort()`
// Step 4: Catch AbortError and ignore it — abort errors are expected,
//         not bugs. Check: `err instanceof DOMException && err.name === "AbortError"`
//
// Trade-off: ignore flag is simpler; AbortController saves bandwidth.
// ---------------------------------------------------------------------------

function useProductSearchWithAbort(query: string): {
  results: SearchResult[];
  isLoading: boolean;
} {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // TODO: implement with AbortController

  return { results, isLoading };
}

// ---------------------------------------------------------------------------
// PROVIDED: Consumer component (don't modify)
//
// This component uses your hook. Type "shoes" quickly — if your cleanup
// is correct, only the final result for "shoes" should appear.
// If cleanup is missing, you'll see results flickering between
// "s", "sh", "sho", "shoe", and "shoes".
// ---------------------------------------------------------------------------

export const ProductSearch: FunctionComponent = () => {
  const [query, setQuery] = useState("");
  const { results, isLoading } = useProductSearch(query);

  return (
    <div>
      <h2>Exercise A: Ignore Flag</h2>
      <input
        type="text"
        value={query}
        placeholder="Search products... (try typing 'shoes' quickly)"
        onChange={(e) => setQuery(e.target.value)}
      />

      {isLoading && <p>Searching...</p>}

      <ul>
        {results.map((result) => (
          <li key={result.id}>
            {result.name} — CHF {result.price.toFixed(2)}
          </li>
        ))}
      </ul>
    </div>
  );
};

export const ProductSearchAbort: FunctionComponent = () => {
  const [query, setQuery] = useState("");
  const { results, isLoading } = useProductSearchWithAbort(query);

  return (
    <div>
      <h2>Exercise B: AbortController</h2>
      <input
        type="text"
        value={query}
        placeholder="Search products... (try typing 'shoes' quickly)"
        onChange={(e) => setQuery(e.target.value)}
      />

      {isLoading && <p>Searching...</p>}

      <ul>
        {results.map((result) => (
          <li key={result.id}>
            {result.name} — CHF {result.price.toFixed(2)}
          </li>
        ))}
      </ul>
    </div>
  );
};
