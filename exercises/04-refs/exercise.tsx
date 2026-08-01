/**
 * Exercise 04: Refs — Non-rendering Values
 * =========================================
 *
 * Mental model: Refs are a "secret pocket" — mutable, not tracked by React.
 * If a value doesn't need to trigger a re-render, it probably belongs in a ref.
 *
 * Key reading: https://react.dev/learn/referencing-values-with-refs
 */

import type { FunctionComponent } from "react";
import { useCallback, useEffect, useState } from "react";
import { type WeatherReading, fetchWeatherReading, fakeSearch } from "./api";

// ---------------------------------------------------------------------------
// Exercise A: Weather Station Poller
//
// This hook polls a weather station API every second. It works, but it
// re-renders far more often than it should.
//
// Step 1: List all the useState calls. For each one, check: is the value
//         ever read in JSX? (Hint: only ONE of them is)
// Step 2: For each non-rendered value, convert useState → useRef.
//         Update reads (.current) and writes (.current = value).
// Step 3: After converting, look at the useCallback dependency arrays.
//         Which dependencies can you remove? Why?
// Step 4: Trace the cascade: how many fewer times does the main
//         useEffect re-run after your fix?
// ---------------------------------------------------------------------------

export function useWeatherStationPoller(stationId: string | null) {
  const [data, setData] = useState<WeatherReading | null>(null);

  const [isFetching, setIsFetching] = useState(false);
  const [intervalId, setIntervalId] = useState<ReturnType<typeof setInterval> | null>(null);
  const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null);

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
      if (document.visibilityState === "visible" && data?.status !== "OFFLINE") {
        performFetch();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
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
// This search component has unnecessary re-renders. Three state values
// don't belong in state.
//
// Step 1: For each useState, ask: "Is this rendered in JSX?"
//         Find the three that aren't (or don't need to be the render trigger).
// Step 2: One of them — previousSearchTerm — is trickier. It IS displayed
//         in JSX. But does it need to be the TRIGGER for that render?
//         (Hint: currentSearchTerm already triggers the render)
// Step 3: When converting previousSearchTerm, you need to update it
//         SYNCHRONOUSLY in the same callback, BEFORE setCurrentSearchTerm.
//         Why? What happens if you update it after?
// ---------------------------------------------------------------------------

export const DebouncedSearch: FunctionComponent = () => {
  const [inputValue, setInputValue] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentSearchTerm, setCurrentSearchTerm] = useState("");
  const [timerId, setTimerId] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [previousSearchTerm, setPreviousSearchTerm] = useState("");

  useEffect(() => {
    setPreviousSearchTerm(currentSearchTerm);
  }, [currentSearchTerm]);

  // Is this rendered in JSX?
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

      {previousSearchTerm && <p>Previous search: &ldquo;{previousSearchTerm}&rdquo;</p>}

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
