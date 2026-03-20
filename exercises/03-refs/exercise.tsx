/**
 * Exercise 03: Refs — Non-rendering Values
 * =========================================
 *
 * Mental model: Refs are a "secret pocket" — mutable, not tracked by React.
 * If a value doesn't need to trigger a re-render, it probably belongs in a ref.
 *
 * Common ref patterns in our codebase:
 *   - Timer IDs (setInterval / setTimeout return values for cleanup)
 *   - Accumulated variables (counters, running totals used only for logging)
 *   - One-time guard refs (has-this-run-yet flags)
 *   - Previous value tracking (reading last render's value in the next render)
 *
 * Key reading: https://react.dev/learn/referencing-values-with-refs
 */

import type { FunctionComponent } from "react";
import { useCallback, useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Exercise A: Weather Station Poller
//
// This hook polls a weather station API for live readings every second.
// Problems:
//   1. `isFetching` is in state, but it's never rendered — it's only used
//      to prevent concurrent requests. Every toggle causes a re-render.
//   2. `intervalId` is in state — setting it triggers a re-render.
//   3. `timeoutId` is in state — same problem.
//   4. The useCallback for `performFetch` depends on `isFetching`, so it's
//      recreated on every fetch cycle, which re-triggers the effect.
//
// Fix: move non-rendering values to refs.
// ---------------------------------------------------------------------------

type StationStatus = "ONLINE" | "OFFLINE";

interface WeatherReading {
  stationId: string;
  status: StationStatus;
  temperatureCelsius: number;
}

// Simulates a fetch call
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
  const [data, setData] = useState<WeatherReading | null>(null);

  // Problem: these are all in state but never rendered
  const [isFetching, setIsFetching] = useState(false);
  const [intervalId, setIntervalId] = useState<ReturnType<
    typeof setInterval
  > | null>(null);
  const [timeoutId, setTimeoutId] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  const performFetch = useCallback(() => {
    if (isFetching || !stationId) {
      return;
    }

    setIsFetching(true);
    fetchWeatherReading(stationId)
      .then((result) => {
        setData(result);
        setIsFetching(false);
      })
      .catch(() => {
        setIsFetching(false);
        // Retry after 1 second
        const retryId = setTimeout(() => {
          performFetch();
        }, 1000);
        setTimeoutId(retryId);
      });
    // Problem: isFetching in deps causes this to be recreated on every fetch
  }, [stationId, isFetching]);

  const cleanup = useCallback(() => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
  }, [intervalId, timeoutId]);

  useEffect(() => {
    if (data?.status === "OFFLINE") {
      cleanup();
      return;
    }

    if (!intervalId) {
      const id = setInterval(() => {
        performFetch();
      }, 1000);
      setIntervalId(id);
    }

    return cleanup;
  }, [performFetch, data?.status, intervalId, cleanup]);

  // Visibility change handler
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

// Demo component
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
// Exercise B: Debounced Search with Previous Value
//
// Problems:
//   1. `timerId` is in state — every debounce timer change causes a re-render
//   2. `previousSearchTerm` is tracked via useEffect — one render behind.
//      This is the key pattern to focus on: instead of syncing previous value
//      via an effect (which runs *after* the render that set the new value),
//      store it in a ref and update it synchronously in the same callback
//      that sets the new value.
//   3. `searchCount` (for debugging) is in state but never rendered
//
// Fix: move all three non-rendering values to refs.
// Pay particular attention to how previousSearchTerm is updated — the goal
// is to have the ref hold the correct "previous" value at the moment we
// commit to the next search term, without any extra render cycle.
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

  // This state is rendered — it's needed to trigger the re-render that
  // shows the new results and the updated "previous search" label.
  const [currentSearchTerm, setCurrentSearchTerm] = useState("");

  // Problem 1: timerId in state — causes re-render on every keystroke debounce
  const [timerId, setTimerId] = useState<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Problem 2 (main learning): previousSearchTerm tracked via effect.
  // The effect runs after the render triggered by setCurrentSearchTerm, so
  // previousSearchTerm is always one render behind the actual previous value.
  const [previousSearchTerm, setPreviousSearchTerm] = useState("");

  useEffect(() => {
    setPreviousSearchTerm(currentSearchTerm);
  }, [currentSearchTerm]);

  // Problem 3: searchCount for debugging — in state but never rendered
  const [searchCount, setSearchCount] = useState(0);

  const handleSearch = (term: string) => {
    // Clear previous timer
    if (timerId) {
      clearTimeout(timerId);
    }

    // Set new debounce timer
    const newTimerId = setTimeout(async () => {
      setIsSearching(true);
      setSearchCount((c) => c + 1);
      console.log(`Search #${searchCount + 1}: "${term}"`);

      const searchResults = await fakeSearch(term);
      setResults(searchResults);
      setCurrentSearchTerm(term);
      setIsSearching(false);
    }, 300);

    setTimerId(newTimerId);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, [timerId]);

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

      {previousSearchTerm && (
        <p>Previous search: &ldquo;{previousSearchTerm}&rdquo;</p>
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
