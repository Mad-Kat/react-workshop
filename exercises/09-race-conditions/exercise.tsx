/**
 * Exercise 09: Race Conditions & Cleanup
 * ========================================
 *
 * Mental model: When a component fires an async request and re-renders
 * before the response arrives, the response is stale.
 *
 * This is a pattern found in our codebase.
 *
 * Key reading: https://react.dev/learn/synchronizing-with-effects#fetching-data
 */

import type { FunctionComponent } from "react";
import { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Exercise: Product Search with Race Conditions
//
// Type "shoes" quickly. The responses for "s", "sh", "sho", "shoe", "shoes"
// arrive out of order and the UI flickers between results.
//
// Step 1: Add a cleanup function with an "ignore" flag
// Step 2: Upgrade to AbortController for proper cancellation
// ---------------------------------------------------------------------------

interface SearchResult {
  id: string;
  name: string;
  price: number;
}

// Simulates an API with random latency (50-500ms)
const searchProducts = async (
  query: string,
  _signal?: AbortSignal,
): Promise<SearchResult[]> => {
  const delay = Math.floor(Math.random() * 450) + 50;
  await new Promise((resolve) => setTimeout(resolve, delay));

  if (!query) return [];
  return [
    { id: `${query}-1`, name: `${query} sneakers`, price: 89.9 },
    { id: `${query}-2`, name: `${query} boots`, price: 149.9 },
    { id: `${query}-3`, name: `${query} sandals`, price: 49.9 },
  ];
};

export const ProductSearch: FunctionComponent = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Bug: no cleanup — stale responses from earlier keystrokes
  // can overwrite results from later keystrokes
  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    setIsLoading(true);

    searchProducts(query).then((data) => {
      // This might be a stale response!
      setResults(data);
      setIsLoading(false);
    });
  }, [query]);

  return (
    <div>
      <input
        type="text"
        value={query}
        placeholder="Search products..."
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
