/**
 * Shared module registry for the fake-SSR simulator.
 *
 * Both the worker ("server") and the main thread ("client") import this, so
 * both sides load the exact same module for a given key — the HTML the worker
 * renders and the tree the client hydrates can never drift apart.
 */
export const exerciseModules = import.meta.glob(
  "../../exercises/*/{exercise,solution}.tsx",
);

/** Resolve a short key like "12-ssr-hydration/exercise" to its glob key. */
export const resolveModuleKey = (shortKey: string): string =>
  `../../exercises/${shortKey}.tsx`;
