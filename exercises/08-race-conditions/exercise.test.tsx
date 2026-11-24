/**
 * Exercise 08 — the "Done when" lists as tests.
 *
 * `npm test` runs these in your browser against exercise.tsx. Once the
 * solution is released they run against solution.tsx too, so you can see what
 * green looks like. They check behaviour, not code: any fix that behaves
 * correctly passes.
 */

import { act, type FunctionComponent } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { getSearchStats, resetSearchStats } from "./api";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

type Exercise08 = typeof import("./exercise");
type Screen = Awaited<ReturnType<typeof render>>;

// exercise.tsx always; solution.tsx only once it has been released.
const targets: Record<string, () => Promise<Exercise08>> = {
  "exercise.tsx": () => import("./exercise"),
  ...Object.fromEntries(
    Object.values(import.meta.glob<Exercise08>("./solution.tsx")).map((load) => [
      "solution.tsx",
      load,
    ]),
  ),
};

/**
 * Advances the fake clock, 100ms at a time, and after each step lets React
 * finish everything the timers caused. `onStep` sees the screen after each
 * step, which is everything you could have seen in real time.
 */
const advance = async (ms: number, onStep?: () => void) => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  try {
    for (let elapsed = 0; elapsed < ms; elapsed += 100) {
      await act(() => vi.advanceTimersByTimeAsync(Math.min(100, ms - elapsed)));
      onStep?.();
    }
  } finally {
    globalThis.IS_REACT_ACT_ENVIRONMENT = false;
  }
};

const searchBox = (screen: Screen) =>
  screen.getByPlaceholder("Search products...").element() as HTMLInputElement;

const setQuery = (screen: Screen, value: string) => {
  const input = searchBox(screen);
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  setValue.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

/** Types one keystroke every 100ms: quick, but every keystroke renders. */
const typeQuickly = async (screen: Screen, text: string, onStep?: () => void) => {
  for (const char of text) {
    setQuery(screen, searchBox(screen).value + char);
    await advance(100, onStep);
  }
};

/** The query the results on screen are for, or null when the list is empty. */
const shownQuery = (screen: Screen) => {
  const first = screen.container.querySelector("li")?.textContent;
  return first ? first.slice(0, first.indexOf(" sneakers")) : null;
};

const isSearching = (screen: Screen) => screen.container.textContent!.includes("Searching...");

/** Longer than the slowest search. */
const SETTLE_MS = 2500;

/** A's "Done when" list, run against either part. */
const searchesLikeA = (getSearch: () => FunctionComponent) => {
  test("once the searches are done, shows the results for what's in the box", async () => {
    const Search = getSearch();
    const screen = await render(<Search />);

    await typeQuickly(screen, "shoes");
    await advance(SETTLE_MS);

    expect(shownQuery(screen)).toBe("shoes");
  });

  test("never replaces results with those for an older query", async () => {
    const Search = getSearch();
    const screen = await render(<Search />);
    const typed = ["s", "sh", "sho", "shoe", "shoes"];
    const seen: string[] = [];
    const record = () => {
      const query = shownQuery(screen);
      if (query !== null && query !== seen.at(-1)) seen.push(query);
    };

    await typeQuickly(screen, "shoes", record);
    await advance(SETTLE_MS, record);

    const order = seen.map((query) => typed.indexOf(query));
    expect(order, `results shown, in order: ${seen.join(" → ")}`).toEqual(
      [...order].sort((a, b) => a - b),
    );
  });

  test('"Searching..." shows exactly while the results for the box are on their way', async () => {
    const Search = getSearch();
    const screen = await render(<Search />);
    expect(isSearching(screen)).toBe(false);

    // "s" is answered after 2s. "sh", typed at 1.5s, after 1s more.
    await typeQuickly(screen, "s");
    await advance(1400);
    await typeQuickly(screen, "h");
    expect(isSearching(screen)).toBe(true);

    await advance(600); // "s" has been answered, "sh" hasn't
    expect(isSearching(screen), '"sh" is still on its way').toBe(true);

    await advance(500);
    expect(shownQuery(screen)).toBe("sh");
    expect(isSearching(screen)).toBe(false);
  });

  test("an empty box shows no results and sends no search", async () => {
    const Search = getSearch();
    const screen = await render(<Search />);

    await typeQuickly(screen, "s");
    await advance(SETTLE_MS);
    expect(shownQuery(screen)).toBe("s");

    setQuery(screen, "");
    await advance(100);
    expect(shownQuery(screen)).toBeNull();
    expect(isSearching(screen)).toBe(false);
    expect(getSearchStats().sent).toBe(1);
  });

  test("…even when you empty it while a search is running", async () => {
    const Search = getSearch();
    const screen = await render(<Search />);

    await typeQuickly(screen, "s");
    setQuery(screen, "");
    await advance(SETTLE_MS);

    expect(shownQuery(screen)).toBeNull();
    expect(isSearching(screen)).toBe(false);
    expect(getSearchStats().sent).toBe(1);
  });
};

for (const [target, load] of Object.entries(targets)) {
  describe(target, () => {
    let mod: Exercise08;
    beforeAll(async () => {
      mod = await load();
    });

    // Every search is a timer, so the clock is fake and `advance` is the only
    // way time passes. Nothing here waits in real time.
    beforeEach(() => {
      vi.useFakeTimers();
      resetSearchStats();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe("A: Product Search", () => {
      searchesLikeA(() => mod.ProductSearch);
    });

    describe("B: Cancellable Product Search", () => {
      searchesLikeA(() => mod.CancellableProductSearch);

      test("aborts a search for a query that is no longer in the box", async () => {
        const screen = await render(<mod.CancellableProductSearch />);

        await typeQuickly(screen, "shoes");
        await advance(SETTLE_MS);

        expect(getSearchStats()).toEqual({ sent: 5, answered: 1, aborted: 4 });
      });

      test("hiding the search while a search is running aborts it", async () => {
        const screen = await render(<mod.CancellableProductSearch />);

        await typeQuickly(screen, "s");
        await screen.unmount();
        await advance(SETTLE_MS);

        expect(getSearchStats()).toEqual({ sent: 1, answered: 0, aborted: 1 });
      });
    });
  });
}
