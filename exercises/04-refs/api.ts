export type StationStatus = "ONLINE" | "OFFLINE";

export interface WeatherReading {
  stationId: string;
  status: StationStatus;
  temperatureCelsius: number;
}

// ---------------------------------------------------------------------------
// Fake weather station backend. Answers after 200ms; about one request in ten
// fails with a network error. The station reports ONLINE until the wrapper
// takes it offline.
// ---------------------------------------------------------------------------

interface StationOptions {
  latencyMs: number;
  failureRate: number;
}

const defaultOptions: StationOptions = { latencyMs: 200, failureRate: 0.1 };
let options = defaultOptions;
let stationIsOffline = false;

export const fetchWeatherReading = (stationId: string): Promise<WeatherReading> =>
  new Promise((resolve, reject) => {
    updateStats({ requests: stats.requests + 1 });
    const shouldFail = Math.random() < options.failureRate;
    setTimeout(() => {
      if (shouldFail) {
        reject(new Error("Network error"));
      } else {
        resolve({
          stationId,
          status: stationIsOffline ? "OFFLINE" : "ONLINE",
          temperatureCelsius: Math.floor(Math.random() * 40),
        });
      }
    }, options.latencyMs);
  });

export const takeStationOffline = () => {
  stationIsOffline = true;
};

/** Used by the tests to make the station deterministic. */
export const configureStation = (patch: Partial<StationOptions>) => {
  options = { ...options, ...patch };
};

export const resetStation = () => {
  options = defaultOptions;
  stationIsOffline = false;
  updateStats({ requests: 0, intervalsStarted: 0 });
};

export const fakeSearch = (term: string): Promise<string[]> =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve([`${term} result 1`, `${term} result 2`, `${term} result 3`]);
    }, 300);
  });

// ---------------------------------------------------------------------------
// Instruments. The wrapper shows these next to the exercise; they are not
// part of it. `startPollingInterval` / `stopPollingInterval` are setInterval
// and clearInterval with a counter attached, so you can see how often the
// polling interval gets (re)started.
// ---------------------------------------------------------------------------

export interface PollingStats {
  requests: number;
  intervalsStarted: number;
}

let stats: PollingStats = { requests: 0, intervalsStarted: 0 };
const statsListeners = new Set<() => void>();

const updateStats = (patch: Partial<PollingStats>) => {
  stats = { ...stats, ...patch };
  statsListeners.forEach((listener) => listener());
};

export const getPollingStats = () => stats;
export const subscribeToPollingStats = (listener: () => void) => {
  statsListeners.add(listener);
  return () => {
    statsListeners.delete(listener);
  };
};

export const startPollingInterval = (callback: () => void, ms: number) => {
  updateStats({ intervalsStarted: stats.intervalsStarted + 1 });
  console.log(`[poller] interval #${stats.intervalsStarted} started`);
  return setInterval(callback, ms);
};

export const stopPollingInterval = (id: ReturnType<typeof setInterval>) => {
  console.log("[poller] interval cleared");
  clearInterval(id);
};
