export type StationStatus = "ONLINE" | "OFFLINE";

export interface WeatherReading {
  stationId: string;
  status: StationStatus;
  temperatureCelsius: number;
}

// Simulates a fetch call
export const fetchWeatherReading = (stationId: string): Promise<WeatherReading> =>
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

export const fakeSearch = (term: string): Promise<string[]> =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve([`${term} result 1`, `${term} result 2`, `${term} result 3`]);
    }, 300);
  });
