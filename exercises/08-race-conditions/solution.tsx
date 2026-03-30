/**
 * Exercise 09: Race Conditions & Cleanup — SOLUTIONS
 * ====================================================
 */

import type { FunctionComponent } from "react";
import { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Shared types and API (same as exercise)
// ---------------------------------------------------------------------------

interface SearchResult {
  id: string;
  name: string;
  price: number;
}

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
// Solution A: useProductSearch with ignore flag
// ---------------------------------------------------------------------------

function useProductSearch(query: string): {
  results: SearchResult[];
  isLoading: boolean;
} {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    let ignore = false;
    setIsLoading(true);

    searchProducts(query).then((data) => {
      // Only update if this effect hasn't been cleaned up
      if (!ignore) {
        setResults(data);
        setIsLoading(false);
      }
    });

    // Cleanup: mark this request as stale
    return () => {
      ignore = true;
    };
  }, [query]);

  return { results, isLoading };
}

// ---------------------------------------------------------------------------
// Solution B: useProductSearchWithAbort using AbortController
// ---------------------------------------------------------------------------

function useProductSearchWithAbort(query: string): {
  results: SearchResult[];
  isLoading: boolean;
} {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    searchProducts(query, controller.signal)
      .then((data) => {
        setResults(data);
        setIsLoading(false);
      })
      .catch((err) => {
        // Ignore abort errors — they're expected
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        setIsLoading(false);
      });

    // Cleanup: abort the in-flight request
    return () => {
      controller.abort();
    };
  }, [query]);

  return { results, isLoading };
}

// ---------------------------------------------------------------------------
// Consumer components (same as exercise)
// ---------------------------------------------------------------------------

export const ProductSearch: FunctionComponent = () => {
  const [query, setQuery] = useState("");
  const { results, isLoading } = useProductSearch(query);

  return (
    <div>
      <h2>Solution A: Ignore Flag</h2>
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

export const ProductSearchAbort: FunctionComponent = () => {
  const [query, setQuery] = useState("");
  const { results, isLoading } = useProductSearchWithAbort(query);

  return (
    <div>
      <h2>Solution B: AbortController</h2>
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

/**
 * Key differences:
 *
 * Ignore flag:
 *   - Simple, works with any Promise-based API
 *   - The request still runs to completion — just the result is ignored
 *   - Sufficient for most cases
 *
 * AbortController:
 *   - Actually cancels the request (saves bandwidth and server resources)
 *   - Works with fetch() natively, needs manual support for other APIs
 *   - Preferred when working with real HTTP requests
 *
 * How Relay handles this:
 *   Relay's refetch() returns a Disposable. When you call refetch() again,
 *   the previous request is automatically disposed. You don't need manual
 *   cleanup — Relay manages the lifecycle. See:
 *   - libraries/cart/src/sidebar/lazy/shoppingCartSidebarContent.tsx
 *   - startTransition(() => refetch({}, { fetchPolicy: "store-and-network" }))
 *
 * >> INSTRUCTOR: React 19 added an `initialValue` parameter to useDeferredValue:
 * >>   const deferredQuery = useDeferredValue(query, '');
 * >> The initial render uses '' (instant), then schedules a re-render with the
 * >> real value. Combined with Suspense, this avoids showing a loading spinner
 * >> on the very first render. Mention this as a modern alternative to debouncing
 * >> for search-as-you-type UIs.
 *
 * Real codebase references:
 *   - domains/dutch-auction/src/auctionEvent/useAuctionStateUpdater.ts: polling with cleanup
 *   - libraries/cart/src/sidebar/lazy/shoppingCartSidebarContent.tsx: Relay auto-management
 */
