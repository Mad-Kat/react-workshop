/**
 * Exercise 04: Refs — Non-rendering Values — SOLUTIONS
 * =====================================================
 */

import type { FunctionComponent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Solution A: Weather Station Poller
//
// Only `data` is rendered — it stays in state.
// Everything else (isFetching, intervalId, timeoutId) is behavioral state
// that controls polling logic but never appears in JSX. Moving them to refs:
//   - eliminates spurious re-renders on every fetch cycle
//   - makes performFetch stable (no isFetching dep)
//   - makes cleanup stable (no intervalId/timeoutId deps)
//   - stops the main effect from re-running on every fetch
// ---------------------------------------------------------------------------

type StationStatus = "ONLINE" | "OFFLINE";

interface WeatherReading {
  stationId: string;
  status: StationStatus;
  temperatureCelsius: number;
}

const fetchWeatherReading = (stationId: string): Promise<WeatherReading> =>
  new Promise((resolve, reject) => {
    const shouldFail = Math.random() < 0.1;
    setTimeout(() => {
      if (shouldFail) {
        reject(new Error("Network error"));
      } else {
        resolve({
          stationId,
          status: Math.random() < 0.05 ? "OFFLINE" : "ONLINE",
          temperatureCelsius: Math.floor(Math.random() * 40),
        });
      }
    }, 200);
  });

export function useWeatherStationPoller(stationId: string | null) {
  // Only `data` is rendered — it stays in state
  const [data, setData] = useState<WeatherReading | null>(null);

  // These are behavioral, not rendered — they belong in refs
  const isFetchingRef = useRef(false);
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // performFetch no longer depends on isFetching (it reads from ref),
  // so it's stable — only depends on stationId
  const performFetch = useCallback(() => {
    if (isFetchingRef.current || !stationId) {
      return;
    }

    isFetchingRef.current = true;
    fetchWeatherReading(stationId)
      .then((result) => {
        setData(result);
        isFetchingRef.current = false;
      })
      .catch(() => {
        isFetchingRef.current = false;
        timeoutIdRef.current = setTimeout(() => {
          performFetch();
        }, 1000);
      });
  }, [stationId]);

  // cleanup no longer depends on intervalId/timeoutId — reads from refs
  const cleanup = useCallback(() => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (data?.status === "OFFLINE") {
      cleanup();
      return;
    }

    if (!intervalIdRef.current) {
      intervalIdRef.current = setInterval(() => {
        performFetch();
      }, 1000);
    }

    return cleanup;
    // Now stable: performFetch and cleanup don't change unless stationId changes
  }, [performFetch, data?.status, cleanup]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        data?.status !== "OFFLINE"
      ) {
        performFetch();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [data?.status, performFetch]);

  return { data };
}

/**
 * What changed:
 *
 * 1. `isFetching` → `isFetchingRef` — never rendered, only used as a guard
 *    against concurrent requests. No re-render needed.
 *
 * 2. `intervalId` → `intervalIdRef` — the interval ID is behavioral state
 *    (used for cleanup), not rendering state.
 *
 * 3. `timeoutId` → `timeoutIdRef` — same as intervalId.
 *
 * 4. `performFetch` dependencies shrunk from `[stationId, isFetching]` to
 *    just `[stationId]` — no more re-creation on every fetch cycle.
 *
 * 5. `cleanup` dependencies shrunk from `[intervalId, timeoutId]` to `[]` —
 *    fully stable.
 *
 * 6. The main effect no longer re-runs on every fetch cycle, which was
 *    the root cause of the instability in the exercise version.
 */

export const WeatherStationDisplay: FunctionComponent<{
  stationId: string;
}> = ({ stationId }) => {
  const { data } = useWeatherStationPoller(stationId);

  if (!data) {
    return <div>Loading weather station...</div>;
  }

  return (
    <div>
      <h2>Station {data.stationId}</h2>
      <p>Status: {data.status}</p>
      <p>Temperature: {data.temperatureCelsius}°C</p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Solution B: Debounced Search with Previous Value
//
// Three state values moved to refs. The previousSearchTerm fix is the most
// instructive: instead of syncing via an effect (one render behind), update
// the ref synchronously in the same callback that sets currentSearchTerm.
// The display still re-renders because currentSearchTerm (state) changes —
// but the ref holds the correct "previous" value at the exact right moment.
// ---------------------------------------------------------------------------

const fakeSearch = (term: string): Promise<string[]> =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve([`${term} result 1`, `${term} result 2`, `${term} result 3`]);
    }, 300);
  });

export const DebouncedSearch: FunctionComponent = () => {
  const [inputValue, setInputValue] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Rendered — triggers the re-render that shows new results and the
  // updated "previous search" label.
  const [currentSearchTerm, setCurrentSearchTerm] = useState("");

  // Fix 1: timerId → ref. Never rendered, only used for cleanup.
  // Cleanup effect now has empty deps — the ref is always current.
  const timerIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fix 2 (main learning): previousSearchTerm → ref, updated synchronously.
  // In the exercise, the effect ran *after* the render triggered by
  // setCurrentSearchTerm, so it was always one cycle late. By assigning
  // `previousSearchTermRef.current = currentSearchTerm` in the same
  // callback — before calling setCurrentSearchTerm — we capture the true
  // previous value at exactly the right moment.
  const previousSearchTermRef = useRef("");

  // Fix 3: searchCount → ref. Only used for console.log, never rendered.
  // Incrementing a ref doesn't cause a re-render.
  const searchCountRef = useRef(0);

  const handleSearch = (term: string) => {
    if (timerIdRef.current) {
      clearTimeout(timerIdRef.current);
    }

    timerIdRef.current = setTimeout(async () => {
      setIsSearching(true);
      searchCountRef.current += 1;
      console.log(`Search #${searchCountRef.current}: "${term}"`);

      const searchResults = await fakeSearch(term);
      setResults(searchResults);

      // Capture the previous term synchronously before moving current forward.
      // This is the critical difference from the effect approach: the ref
      // holds the right value in this same render, not one render later.
      previousSearchTermRef.current = currentSearchTerm;
      setCurrentSearchTerm(term);
      setIsSearching(false);
    }, 300);
  };

  // Cleanup on unmount — no dependency on timerId state
  useEffect(() => {
    return () => {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
      }
    };
  }, []);

  return (
    <div>
      <input
        type="text"
        value={inputValue}
        placeholder="Search products..."
        onChange={(e) => {
          setInputValue(e.target.value);
          handleSearch(e.target.value);
        }}
      />

      {previousSearchTermRef.current && (
        <p>Previous search: &ldquo;{previousSearchTermRef.current}&rdquo;</p>
      )}

      {isSearching ? (
        <p>Searching...</p>
      ) : (
        <ul>
          {results.map((result, i) => (
            <li key={i}>{result}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

/**
 * What changed:
 *
 * 1. timerId: state → ref
 *    - Never rendered, only used to clear the previous timer
 *    - No more re-render on every debounce cycle
 *    - Cleanup effect has empty deps (ref is always current)
 *
 * 2. previousSearchTerm: state + effect → ref (main pattern)
 *    - Updated synchronously in the search callback, before setCurrentSearchTerm
 *    - No more "one render behind" issue from the effect
 *    - Note: reading a ref in JSX won't trigger a re-render when it
 *      changes — the display updates because `currentSearchTerm` (state)
 *      also changes at the same time
 *
 * 3. searchCount: state → ref
 *    - Only used for console.log, never rendered
 *    - Incrementing a ref doesn't cause a re-render
 *
 * Real codebase references:
 *   - domains/dutch-auction/src/auctionEvent/useAuctionStateUpdater.ts: timer ID refs
 *   - libraries/product-updates-notifications/src/productDetailPage/useSubscribeToPriceChange.tsx: one-time guard ref
 */
