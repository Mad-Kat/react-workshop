/**
 * Exercise 04: Refs — Non-rendering Values
 * =========================================
 *
 * Mental model: Refs are a "secret pocket" — mutable, not tracked by React.
 *
 * Key reading: https://react.dev/learn/referencing-values-with-refs
 *
 * `npm test` runs the "Done when" lists below in your browser.
 */

import type { FunctionComponent } from "react";
import { useCallback, useEffect, useState } from "react";
import { useRenderCount } from "../useRenderCount";
import { RenderCount } from "../RenderCount";
import {
  type WeatherReading,
  fakeSearch,
  fetchWeatherReading,
  startPollingInterval,
  stopPollingInterval,
} from "./api";

// ---------------------------------------------------------------------------
// Exercise A: Weather Station Poller
//
// `useWeatherStationPoller` asks the station for a reading once a second and
// hands the latest one to the display. A failed request is retried after a
// second, only one request is in flight at a time, and polling stops for good
// once the station reports OFFLINE.
//
// Run it and watch the numbers. The display renders about six times per
// request, and the interval that drives the polling is cleared and started
// over twice per request. A new reading is the only reason this display has
// to render.
//
// Done when:
//   - `renders` climbs by one per request, not six
//   - `intervals started` stays at 1 until you take the station offline
//   - a failed request doesn't render anything and polling carries on, there
//     is still never more than one request in flight, and polling still
//     stops on OFFLINE
// ---------------------------------------------------------------------------

export function useWeatherStationPoller(stationId: string | null) {
  const [data, setData] = useState<WeatherReading | null>(null);

  const [isFetching, setIsFetching] = useState(false);
  const [intervalId, setIntervalId] = useState<ReturnType<typeof setInterval> | null>(null);
  const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null);

  const isOffline = data?.status === "OFFLINE";

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
        const retryId = setTimeout(() => {
          performFetch();
        }, 1000);
        setTimeoutId(retryId);
      });
  }, [stationId, isFetching]);

  const cleanup = useCallback(() => {
    if (intervalId) {
      stopPollingInterval(intervalId);
      setIntervalId(null);
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
  }, [intervalId, timeoutId]);

  useEffect(() => {
    if (isOffline) {
      cleanup();
      return;
    }

    if (!intervalId) {
      const id = startPollingInterval(() => {
        performFetch();
      }, 1000);
      setIntervalId(id);
    }

    return cleanup;
  }, [performFetch, isOffline, intervalId, cleanup]);

  // Fetch right away when the tab comes back into view instead of waiting
  // for the next tick of the interval
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !isOffline) {
        performFetch();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isOffline, performFetch]);

  return { data };
}

export const WeatherStationDisplay: FunctionComponent<{
  stationId: string;
}> = ({ stationId }) => {
  const renderCount = useRenderCount();
  const { data } = useWeatherStationPoller(stationId);

  return (
    <div>
      <h3>
        Station {stationId} <RenderCount count={renderCount} />
      </h3>
      {data ? (
        <>
          <p>Status: {data.status}</p>
          <p>Temperature: {data.temperatureCelsius}°C</p>
        </>
      ) : (
        <p>Waiting for the first reading...</p>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Exercise B: Debounced Search
//
// Typing runs a search 300ms after the last keystroke and shows the results,
// plus a line naming the term that was searched before the current one.
//
// Run it. Type "re", wait for the results, then type "act". "Previous search"
// now claims the previous search was "react" — that is the current one. Watch
// the render counter while you do it: each search costs one render more than
// the two it needs (one to show "Searching...", one to show the results).
//
// Done when:
//   - "Previous search" names the term that was searched before the one
//     whose results are on screen
//   - a search costs two renders, keystrokes aside
//   - the component doesn't render for values that never show up on screen
//   - the "Search #n" line in the console keeps counting, and hiding the
//     search while a search is pending still cancels it
// ---------------------------------------------------------------------------

export const DebouncedSearch: FunctionComponent = () => {
  const renderCount = useRenderCount();
  const [inputValue, setInputValue] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentSearchTerm, setCurrentSearchTerm] = useState("");
  const [previousSearchTerm, setPreviousSearchTerm] = useState("");
  const [timerId, setTimerId] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [searchCount, setSearchCount] = useState(0);

  useEffect(() => {
    setPreviousSearchTerm(currentSearchTerm);
  }, [currentSearchTerm]);

  const handleSearch = (term: string) => {
    if (timerId) {
      clearTimeout(timerId);
    }

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

  // A pending search must not fire after the component is gone
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
      <RenderCount count={renderCount} />

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
