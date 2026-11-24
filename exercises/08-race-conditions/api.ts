export interface SearchResult {
  id: string;
  name: string;
  price: number;
}

// ---------------------------------------------------------------------------
// Fake product search backend. The shorter the query, the more products it
// matches and the longer it takes: one letter takes 2 seconds, two letters
// 1 second, anything longer 300ms. Pass an AbortSignal to be able to cancel
// a search; an aborted search rejects with a DOMException named "AbortError",
// like fetch() does.
// ---------------------------------------------------------------------------

export const searchLatencyMs = (query: string) =>
  query.length <= 1 ? 2000 : query.length === 2 ? 1000 : 300;

export const searchProducts = (query: string, signal?: AbortSignal): Promise<SearchResult[]> =>
  new Promise((resolve, reject) => {
    updateStats({ sent: stats.sent + 1 });

    const abort = () => {
      clearTimeout(timeout);
      updateStats({ aborted: stats.aborted + 1 });
      reject(new DOMException("The search was aborted.", "AbortError"));
    };

    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      updateStats({ answered: stats.answered + 1 });
      resolve([
        { id: `${query}-1`, name: `${query} sneakers`, price: 89.9 },
        { id: `${query}-2`, name: `${query} boots`, price: 149.9 },
        { id: `${query}-3`, name: `${query} sandals`, price: 49.9 },
      ]);
    }, searchLatencyMs(query));

    if (signal?.aborted) {
      abort();
    } else {
      signal?.addEventListener("abort", abort, { once: true });
    }
  });

// ---------------------------------------------------------------------------
// Instruments. The wrapper shows these next to the exercise; they are not
// part of it. `answered` counts searches that ran to the end, whether or not
// anyone used the results. `aborted` counts searches cancelled before that.
// ---------------------------------------------------------------------------

export interface SearchStats {
  sent: number;
  answered: number;
  aborted: number;
}

const noStats: SearchStats = { sent: 0, answered: 0, aborted: 0 };
let stats = noStats;
const statsListeners = new Set<() => void>();

const updateStats = (patch: Partial<SearchStats>) => {
  stats = { ...stats, ...patch };
  statsListeners.forEach((listener) => listener());
};

export const getSearchStats = () => stats;
export const resetSearchStats = () => updateStats(noStats);
export const subscribeToSearchStats = (listener: () => void) => {
  statsListeners.add(listener);
  return () => {
    statsListeners.delete(listener);
  };
};
