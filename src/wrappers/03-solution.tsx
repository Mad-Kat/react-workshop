import { WeatherStationDisplay, DebouncedSearch } from "../../exercises/03-refs/solution.tsx";

export default function Wrapper() {
  return (
    <>
      <h2>A: Weather Station Poller</h2>
      <WeatherStationDisplay stationId="station-1" />
      <h2>B: Debounced Search</h2>
      <DebouncedSearch />
    </>
  );
}
