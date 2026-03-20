/**
 * Exercise 06: Events vs Effects — SOLUTIONS
 * ============================================
 *
 * Two solutions are shown below:
 *   - Step 1: Simple handler-based approach (with noted stale closure risk)
 *   - Step 2: Robust pendingVariablesRef pattern (primary solution)
 */

import type { FunctionComponent } from "react";
import { useEffect, useRef, useState, useTransition } from "react";

type Grouping = "WEEK" | "QUARTER";

interface ReportData {
  entries: Array<{ id: string; label: string; count: number }>;
  tags: Array<{ name: string; count: number }>;
}

const fetchReportData = (
  variables: Record<string, unknown>,
): Promise<ReportData> =>
  new Promise((resolve) => {
    console.log("Fetching with:", variables);
    setTimeout(
      () =>
        resolve({
          entries: [
            { id: "e1", label: "Week 1", count: 14 },
            { id: "e2", label: "Week 2", count: 9 },
          ],
          tags: [
            { name: "Infrastructure", count: 7 },
            { name: "Frontend", count: 3 },
          ],
        }),
      300,
    );
  });

// ---------------------------------------------------------------------------
// Step 1 (simpler alternative — not shown):
//   Move refetch calls directly into click handlers. Works well for most UIs
//   but has a stale closure risk: selectTag closes over `grouping` state, so
//   rapid grouping+tag changes can read a stale value.
//
// Step 2 below solves this with pendingVariablesRef.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Step 2 Solution (robust — primary)
//
// Introduces `pendingVariablesRef` to accumulate partial variable updates.
// Each handler specifies only what it's changing; the ref remembers the rest.
// No stale closures — handlers never need to read state to build variables.
// ---------------------------------------------------------------------------

export const ReportViewerPage: FunctionComponent = () => {
  const [data, setData] = useState<ReportData | null>(null);
  const [grouping, setGrouping] = useState<Grouping>("WEEK");
  const [, startTransition] = useTransition();

  const hashReportId =
    typeof window !== "undefined"
      ? new URLSearchParams(location.hash.replace(/^#/, "")).get("reportId")
      : null;

  const hasRestoredReportId = useRef(false);

  // Accumulated variables ref — each handler only specifies what it's
  // changing; the ref remembers the rest so no stale closures are needed
  const pendingVariablesRef = useRef<Record<string, unknown>>({
    grouping: "WEEK",
    take: 12,
  });

  const refetchWithCurrentVariables = (
    variables: Record<string, unknown>,
  ) => {
    pendingVariablesRef.current = {
      ...pendingVariablesRef.current,
      ...variables,
    };
    startTransition(() => {
      fetchReportData(pendingVariablesRef.current).then(setData);
    });
  };

  // EVENT HANDLER: setGrouping — responds to user click, not a state change
  const handleSetGrouping = (newGrouping: Grouping) => {
    setGrouping(newGrouping);
    refetchWithCurrentVariables({
      grouping: newGrouping,
      take: 12,
      entriesForTagId: null,
    });
  };

  // EVENT HANDLER: selectTag — responds to user click.
  // No stale closure risk: we don't read `grouping` state here — the ref
  // already holds the current grouping from the last handleSetGrouping call.
  const handleSelectTag = (tagId: string) => {
    refetchWithCurrentVariables({
      entriesForTagId: tagId,
    });
  };

  // LEGITIMATE EFFECT: restores state from URL hash on back-navigation.
  // This synchronizes with the browser navigation API — React doesn't
  // control back/forward navigation.
  useEffect(() => {
    if (hasRestoredReportId.current || !hashReportId) {
      return;
    }
    hasRestoredReportId.current = true;
    refetchWithCurrentVariables({
      entriesForTagId: hashReportId,
    });
  }, [hashReportId]);

  // Initial fetch on mount
  useEffect(() => {
    refetchWithCurrentVariables({});
  }, []);

  return (
    <div>
      <h1>Exercise 06 — Reports</h1>

      <div>
        {/* Refetch is now in the handler, not in an effect watching grouping */}
        <button onClick={() => handleSetGrouping("WEEK")}>Weekly</button>
        <button onClick={() => handleSetGrouping("QUARTER")}>Quarterly</button>
      </div>

      {data && (
        <>
          <h2>Entries</h2>
          {data.entries.map((e) => (
            <button key={e.id} onClick={() => handleSelectTag(e.id)}>
              {e.label}: {e.count}
            </button>
          ))}

          <h2>Tags</h2>
          {data.tags.map((t) => (
            <p key={t.name}>
              {t.name}: {t.count}
            </p>
          ))}
        </>
      )}
    </div>
  );
};

/**
 * What changed:
 *
 * 1. Effects 1 and 2 (grouping/tag changes) moved into click handlers.
 *    These were responses to user actions — not external synchronization.
 *
 * 2. Effect 3 (URL hash restoration) kept as an effect.
 *    Browser back/forward is an external event React doesn't control.
 *
 * 3. Introduced `pendingVariablesRef` to accumulate partial variable updates.
 *    Each handler specifies only what it's changing. The ref remembers the
 *    rest — no stale closures, no redundant state.
 *
 * Step 1 vs Step 2:
 *   Step 1 (handlers with direct state reads) works fine for most UIs.
 *   Step 2 (pendingVariablesRef) is necessary when handlers compose partial
 *   updates and you can't afford stale closure reads between renders.
 *
 * Real codebase references:
 *   - domains/spending/src/spending.tsx: refetchVariablesRef, events vs effects, URL hash restoration
 */
