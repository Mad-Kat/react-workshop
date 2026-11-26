/**
 * Exercise 08: Race Conditions & Cleanup
 * ========================================
 *
 * Mental model: A response belongs to the effect that asked for it. Once that
 * effect has been cleaned up, its response is stale.
 *
 * Key reading: https://react.dev/learn/synchronizing-with-effects#fetching-data
 *
 * `npm test` runs the "Done when" lists below in your browser.
 */

import type { FunctionComponent } from "react";
import { useEffect, useState } from "react";
import { type SearchResult, searchProducts } from "./api";

// ---------------------------------------------------------------------------
// Exercise A: Product Search
//
// `useProductSearch` searches as you type and hands back the results for
// what's in the box, and whether they are still on their way. An empty box
// means no results and no search. Short queries match more products, so they
// take longer: a one-letter search takes 2 seconds (see api.ts).
//
// Type "shoes" quickly. The results for "shoes" show up, and a moment later
// the list switches back to "sh" and then "s", and stays there.
//
// Done when:
//   - once the searches are done, the list shows the results for what's in
//     the box, however fast you type
//   - once results for a query are on screen, results for an older query
//     never replace them
//   - "Searching..." shows exactly while the results for what's in the box
//     are on their way
//   - an empty box shows no results and sends no search, even when you
//     empty it while a search is running
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

    setIsLoading(true);
    searchProducts(query).then((data) => {
      setResults(data);
      setIsLoading(false);
    });
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
// Exercise B: Cancellable Product Search
//
// `useCancellableProductSearch` starts out where `useProductSearch` started.
// Once A works, stale results no longer reach the screen, but every search
// still runs to the end. Type "shoes" in A and watch the counters: all five
// searches are answered, including the 2-second one for "s" that nobody is
// waiting for any more. `searchProducts` can be cancelled: it takes an
// AbortSignal.
//
// Done when:
//   - everything on A's list holds here too
//   - a search for a query that is no longer in the box is aborted, not
//     answered
//   - hiding the search while a search is running aborts it
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

    setIsLoading(true);
    searchProducts(query).then((data) => {
      setResults(data);
      setIsLoading(false);
    });
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
// The search box and the list. Both parts use it as is.
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
