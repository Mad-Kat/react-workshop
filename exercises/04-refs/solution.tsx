/**
 * Exercise 04: Refs — Non-rendering Values — SOLUTIONS
 * =====================================================
 */

import type { FunctionComponent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
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
// Solution A: Weather Station Poller
//
// Of the four state variables only `data` is ever shown. `isFetching`,
// `intervalId` and `timeoutId` are bookkeeping: the hook has to remember them
// between renders, but nothing on screen changes when they do. As state, every
// write to them was a render, every render gave `performFetch` and `cleanup` a
// new identity, and every new identity re-ran the effect that owns the
// interval. As refs they are read at call time instead of captured at render
// time, so the callbacks stay stable, the effect runs once, and the only
// renders left are the readings.
// ---------------------------------------------------------------------------

export function useWeatherStationPoller(stationId: string | null) {
  const [data, setData] = useState<WeatherReading | null>(null);

  const isFetchingRef = useRef(false);
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOffline = data?.status === "OFFLINE";

  // Depends on stationId alone: the in-flight flag is read when the function
  // runs, not baked in when it is created.
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

  const cleanup = useCallback(() => {
    if (intervalIdRef.current) {
      stopPollingInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
  }, []);

  // Runs on mount and again when the station goes offline. The cleanup of the
  // previous run has already stopped the interval by then, so going offline
  // is just "don't start a new one".
  useEffect(() => {
    if (isOffline) {
      return;
    }

    intervalIdRef.current = startPollingInterval(() => {
      performFetch();
    }, 1000);

    return cleanup;
  }, [performFetch, isOffline, cleanup]);

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
// Solution B: Debounced Search
//
// Two questions sort the variables. Does the UI show it? Does the component
// merely have to remember it between renders? `timerId` and `searchCount` are
// remembered but never shown, so they become refs. `previousSearchTerm` IS
// shown, so it stays state. Its bug was timing: an effect can only run after
// the render in which `currentSearchTerm` has already moved on, so the
// "previous" term it copied was always the current one. The term of the last
// completed search is the third ref: the component needs it exactly once, at
// the moment the next search completes, and can set the state right there.
// ---------------------------------------------------------------------------

export const DebouncedSearch: FunctionComponent = () => {
  const renderCount = useRenderCount();
  const [inputValue, setInputValue] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [previousSearchTerm, setPreviousSearchTerm] = useState("");

  const timerIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchCountRef = useRef(0);
  const lastSearchedTermRef = useRef("");

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
      // The previous term is known right here. No effect needed to find it
      // one render later.
      setPreviousSearchTerm(lastSearchedTermRef.current);
      lastSearchedTermRef.current = term;
      setIsSearching(false);
    }, 300);
  };

  // A pending search must not fire after the component is gone. The cleanup
  // reads the ref when it runs, so this no longer has to re-subscribe on
  // every new timer.
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

// ---------------------------------------------------------------------------
// Key takeaway
//   Two questions decide where a value lives. Does the UI show it? State.
//   Does the component only have to remember it between renders — a timer
//   id, an in-flight flag, a counter, the last thing it saw? A ref: writing
//   one doesn't render, and reading one at call time doesn't belong in a
//   dependency array. Bookkeeping in useState means renders for nothing and
//   callbacks that change identity for nothing.
// ---------------------------------------------------------------------------
