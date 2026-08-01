/**
 * Exercise 04: Refs — Non-rendering Values — SOLUTIONS
 * =====================================================
 */

import type { FunctionComponent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { type WeatherReading, fetchWeatherReading, fakeSearch } from "./api";

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

export function useWeatherStationPoller(stationId: string | null) {
  // Only `data` is rendered — it stays in state
  const [data, setData] = useState<WeatherReading | null>(null);

  // These are behavioral, not rendered — they belong in refs
  const isFetchingRef = useRef(false);
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // performFetch no longer depends on isFetching (it reads from ref),
  // so it's stable and only depends on stationId
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

  // cleanup no longer depends on intervalId/timeoutId
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
      if (document.visibilityState === "visible" && data?.status !== "OFFLINE") {
        performFetch();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [data?.status, performFetch]);

  return { data };
}

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

export const DebouncedSearch: FunctionComponent = () => {
  const [inputValue, setInputValue] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  // Rendered —> triggers the re-render that shows new results and the
  // updated "previous search" label.
  const [currentSearchTerm, setCurrentSearchTerm] = useState("");
  // Fix 1: timerId → ref. Never rendered, only used for cleanup.
  // Cleanup effect now has empty deps and the ref is always current.
  const timerIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Fix 2 (main learning): previousSearchTerm → ref, updated synchronously.
  // In the exercise, the effect ran *after* the render triggered by
  // setCurrentSearchTerm, so it was always one cycle late. By assigning
  // `previousSearchTermRef.current = currentSearchTerm` in the same
  // callback andbefore calling setCurrentSearchTerm — we capture the true
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

// ---------------------------------------------------------------------------
// Key takeaway
//   State is for values the UI renders. Refs are for values the component has
//   to remember but never shows: timers, in-flight flags, previous values.
//   Behavioral state in useState means a re-render for nothing.
// ---------------------------------------------------------------------------
