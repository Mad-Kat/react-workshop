/**
 * Exercise 08: Race Conditions & Cleanup — SOLUTIONS
 * ====================================================
 */

import type { FunctionComponent } from "react";
import { useEffect, useState } from "react";
import { type SearchResult, searchProducts } from "./api";

// ---------------------------------------------------------------------------
// Solution A: Product Search
//
// Every keystroke starts a search, and nothing ties a response to the query
// it was for: whichever answer arrives last wins, and the slowest one is for
// the shortest, oldest query. React already knows when a search stops being
// wanted: it runs the effect's cleanup before it runs the effect for the next
// query, and when the component goes away. So the cleanup flips a flag that
// only this run of the effect can see, and a response that finds the flag set
// does nothing at all. Not setResults, and not setIsLoading either: the
// current run has set isLoading to true and will set it back when its own
// response arrives.
// ---------------------------------------------------------------------------

export function useProductSearch(query: string): {
  results: SearchResult[];
  isLoading: boolean;
} {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    let ignore = false;
    setIsLoading(true);
    searchProducts(query).then((data) => {
      if (!ignore) {
        setResults(data);
        setIsLoading(false);
      }
    });

    // The next query, or unmounting, makes this run's response stale
    return () => {
      ignore = true;
    };
  }, [query]);

  return { results, isLoading };
}

export const ProductSearch: FunctionComponent = () => {
  const [query, setQuery] = useState("");
  const { results, isLoading } = useProductSearch(query);

  return (
    <SearchForm query={query} onQueryChange={setQuery} results={results} isLoading={isLoading} />
  );
};

// ---------------------------------------------------------------------------
// Solution B: Cancellable Product Search
//
// Same moment, stronger action: the cleanup aborts the search instead of
// marking it ignored. An aborted search never resolves, so `.then` only ever
// sees the current query's results and needs no flag. It rejects with an
// AbortError instead, which is the expected outcome of the cleanup, not a
// failure, so the `.catch` swallows that one and nothing else.
// ---------------------------------------------------------------------------

export function useCancellableProductSearch(query: string): {
  results: SearchResult[];
  isLoading: boolean;
} {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    searchProducts(query, controller.signal)
      .then((data) => {
        setResults(data);
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        throw error;
      });

    // The next query, or unmounting, cancels this run's search
    return () => controller.abort();
  }, [query]);

  return { results, isLoading };
}

export const CancellableProductSearch: FunctionComponent = () => {
  const [query, setQuery] = useState("");
  const { results, isLoading } = useCancellableProductSearch(query);

  return (
    <SearchForm query={query} onQueryChange={setQuery} results={results} isLoading={isLoading} />
  );
};

// ---------------------------------------------------------------------------
// Unchanged
// ---------------------------------------------------------------------------

const SearchForm: FunctionComponent<{
  query: string;
  onQueryChange: (query: string) => void;
  results: SearchResult[];
  isLoading: boolean;
}> = ({ query, onQueryChange, results, isLoading }) => (
  <div>
    <input
      type="text"
      value={query}
      placeholder="Search products..."
      onChange={(e) => onQueryChange(e.target.value)}
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

/**
 * Key differences:
 *
 * Ignore flag:
 *   - Works with any promise, whether or not it can be cancelled
 *   - The search still runs to the end; only its result is dropped
 *   - Enough for most cases
 *
 * AbortController:
 *   - Cancels the search itself, which saves the server and the network
 *     the work
 *   - fetch() takes a signal natively; other APIs have to support it
 *   - Needs a .catch that tells an abort apart from a real failure
 *   - If something after the response can't be aborted, keep the ignore
 *     flag as well. The two combine fine.
 *
 * How Relay handles this:
 *   Relay's refetch() returns a Disposable, and calling refetch() again
 *   disposes the previous request for you. The race in this exercise is the
 *   one Relay is solving behind your back. See:
 *   - libraries/cart/src/sidebar/lazy/shoppingCartSidebarContent.tsx
 *   - startTransition(() => refetch({}, { fetchPolicy: "store-and-network" }))
 *
 * Real codebase references:
 *   - domains/dutch-auction/src/auctionEvent/useAuctionStateUpdater.ts: polling with cleanup
 *   - libraries/cart/src/sidebar/lazy/shoppingCartSidebarContent.tsx: Relay auto-management
 */

// ---------------------------------------------------------------------------
// Key takeaway
//   A response can arrive after the component has moved on. Every async effect
//   needs cleanup that invalidates the in-flight request: an ignore flag for
//   most cases, AbortController when cancelling the request is worth it.
// ---------------------------------------------------------------------------
