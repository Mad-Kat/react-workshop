import { useState, useSyncExternalStore } from "react";
import { WeatherStationDisplay, DebouncedSearch } from "../../exercises/04-refs/exercise.tsx";
import {
  getPollingStats,
  resetStation,
  subscribeToPollingStats,
  takeStationOffline,
} from "../../exercises/04-refs/api.ts";

// Lives out here so it doesn't add renders to the component you're watching.
function PollingStats() {
  const stats = useSyncExternalStore(subscribeToPollingStats, getPollingStats);
  return (
    <p style={{ color: stats.intervalsStarted > 1 ? "#dc2626" : "#666" }}>
      Requests sent: <strong>{stats.requests}</strong> · Intervals started:{" "}
      <strong>{stats.intervalsStarted}</strong>
    </p>
  );
}

export default function Wrapper() {
  const [stationRun, setStationRun] = useState(0);
  const [showSearch, setShowSearch] = useState(true);

  return (
    <>
      <h2>A: Weather Station Poller</h2>
      <p style={{ fontSize: 12, color: "#999" }}>
        The console shows every time the polling interval is started or cleared.
      </p>
      <button onClick={takeStationOffline}>Take station offline</button>{" "}
      <button
        onClick={() => {
          resetStation();
          setStationRun((run) => run + 1);
        }}
      >
        Restart station
      </button>
      <PollingStats />
      <WeatherStationDisplay key={stationRun} stationId="station-1" />
      <h2>B: Debounced Search</h2>
      <p style={{ fontSize: 12, color: "#999" }}>
        Try: type "re", wait for the results, then type "act".
      </p>
      <button onClick={() => setShowSearch((show) => !show)}>
        {showSearch ? "Hide" : "Show"} search
      </button>
      {showSearch && <DebouncedSearch />}
    </>
  );
}
