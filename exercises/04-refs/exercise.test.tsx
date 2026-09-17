/**
 * Exercise 04 — the "Done when" lists as tests.
 *
 * `npm test` runs these in your browser against exercise.tsx. Once the
 * solution is released they run against solution.tsx too, so you can see what
 * green looks like. They check behaviour, not code: any fix that behaves
 * correctly passes.
 */

import { act } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { configureStation, getPollingStats, resetStation, takeStationOffline } from "./api";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

type Exercise04 = typeof import("./exercise");
type Screen = Awaited<ReturnType<typeof render>>;

// exercise.tsx always; solution.tsx only once it has been released.
const targets: Record<string, () => Promise<Exercise04>> = {
  "exercise.tsx": () => import("./exercise"),
  ...Object.fromEntries(
    Object.values(import.meta.glob<Exercise04>("./solution.tsx")).map((load) => [
      "solution.tsx",
      load,
    ]),
  ),
};

/** The number in the red `renders: n` badge. */
const renderCount = (screen: Screen) =>
  Number(
    screen
      .getByText(/renders: \d+/)
      .element()
      .textContent?.match(/\d+/)?.[0],
  );

/** Asserts the text is on screen right now. Fails with the current DOM if it isn't. */
const expectOnScreen = (screen: Screen, text: string) =>
  expect(screen.getByText(text).element()).toBeVisible();

/** Types into a controlled input one keystroke at a time. */
const typeInto = (screen: Screen, text: string) => {
  const input = screen.getByPlaceholder("Search products...").element() as HTMLInputElement;
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  for (const char of text) {
    setValue.call(input, input.value + char);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }
};

/**
 * Advances the fake clock, 100ms at a time, and after each step lets React
 * finish everything the timers caused: renders, effects, the lot. Stepping
 * matters: a timer and the response to it have to render separately, like
 * they do in real time, not collapse into one batch.
 */
const advance = async (ms: number) => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  try {
    for (let elapsed = 0; elapsed < ms; elapsed += 100) {
      await act(() => vi.advanceTimersByTimeAsync(Math.min(100, ms - elapsed)));
    }
  } finally {
    globalThis.IS_REACT_ACT_ENVIRONMENT = false;
  }
};

for (const [target, load] of Object.entries(targets)) {
  describe(target, () => {
    let mod: Exercise04;
    beforeAll(async () => {
      mod = await load();
    });

    // Both parts are driven by timers, so the clock is fake and `advance` is
    // the only way time passes. Nothing here waits in real time.
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    describe("A: Weather Station Poller", () => {
      beforeEach(() => {
        resetStation();
        configureStation({ failureRate: 0 });
      });

      // One polling cycle. The station answers 200ms after a request, so 1200ms
      // always covers one request and its response, however the interval drifts.
      const cycle = () => advance(1200);

      test("renders once per request, not six", async () => {
        const screen = await render(<mod.WeatherStationDisplay stationId="station-1" />);

        await cycle();
        await cycle();
        await cycle();

        expect(getPollingStats().requests).toBe(3);
        expect(renderCount(screen)).toBe(1 + 3);
      });

      test("starts the polling interval once", async () => {
        await render(<mod.WeatherStationDisplay stationId="station-1" />);

        await cycle();
        await cycle();
        await cycle();

        expect(getPollingStats().intervalsStarted).toBe(1);
      });

      test("keeps polling after a failed request, without rendering for it", async () => {
        configureStation({ failureRate: 1 });
        const screen = await render(<mod.WeatherStationDisplay stationId="station-1" />);

        await cycle();
        configureStation({ failureRate: 0 });
        expect(getPollingStats().requests).toBe(1);
        expect(renderCount(screen)).toBe(1);

        await cycle();
        expect(getPollingStats().requests).toBeGreaterThanOrEqual(2);
        expectOnScreen(screen, "Status: ONLINE");
      });

      test("never has more than one request in flight", async () => {
        configureStation({ latencyMs: 2500 });
        await render(<mod.WeatherStationDisplay stationId="station-1" />);

        // The interval ticks at 1s, 2s and 3s while the first request is still out.
        await advance(3000);
        expect(getPollingStats().requests).toBe(1);

        await advance(1500);
        expect(getPollingStats().requests).toBe(2);
      });

      test("stops polling once the station reports OFFLINE", async () => {
        const screen = await render(<mod.WeatherStationDisplay stationId="station-1" />);
        await cycle();

        takeStationOffline();
        await cycle();
        expectOnScreen(screen, "Status: OFFLINE");

        const statsWhenOffline = getPollingStats();
        await cycle();
        await cycle();
        await cycle();
        expect(getPollingStats()).toEqual(statsWhenOffline);
      });
    });

    describe("B: Debounced Search", () => {
      /** Waits out the 300ms debounce and the 300ms the search takes. */
      const settle = () => advance(600);

      test("names the term that was searched before the current one", async () => {
        const screen = await render(<mod.DebouncedSearch />);

        typeInto(screen, "re");
        await settle();
        typeInto(screen, "act");
        await settle();

        expectOnScreen(screen, "react result 1");
        expectOnScreen(screen, "Previous search: “re”");
      });

      test("a search costs two renders, keystrokes aside", async () => {
        const screen = await render(<mod.DebouncedSearch />);

        typeInto(screen, "r");
        const afterTyping = renderCount(screen);

        await settle();
        expectOnScreen(screen, "r result 1");
        expect(renderCount(screen) - afterTyping).toBe(2);
      });

      test("keeps counting searches in the console", async () => {
        const log = vi.spyOn(console, "log").mockImplementation(() => {});
        const screen = await render(<mod.DebouncedSearch />);

        typeInto(screen, "re");
        await settle();
        typeInto(screen, "act");
        await settle();

        const lines = log.mock.calls.map(([line]) => String(line));
        expect(lines).toContain('Search #1: "re"');
        expect(lines).toContain('Search #2: "react"');
      });

      test("cancels a pending search when unmounted", async () => {
        const log = vi.spyOn(console, "log").mockImplementation(() => {});
        const screen = await render(<mod.DebouncedSearch />);

        typeInto(screen, "re");
        await screen.unmount();
        await advance(1000);

        const lines = log.mock.calls.map(([line]) => String(line));
        expect(lines.filter((line) => line.startsWith("Search #"))).toEqual([]);
      });
    });
  });
}
