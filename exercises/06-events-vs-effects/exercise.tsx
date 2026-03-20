/**
 * Exercise 06: Events vs Effects — The Core Taxonomy
 * =====================================================
 *
 * Mental model: Event handlers run because something specific happened.
 * Effects run whenever synchronization is needed.
 *
 * This component has ALL its refetch logic in effects. Some should be
 * event handlers. Refactor.
 *
 * Key reading: https://react.dev/learn/separating-events-from-effects
 */

import type { FunctionComponent } from "react";
import { useEffect, useRef, useState, useTransition } from "react";

// ---------------------------------------------------------------------------
// Exercise: Report Viewer Page
//
// This component has three effects that trigger refetches:
//   1. When `grouping` changes → refetch
//   2. When `selectedTagId` changes → refetch
//   3. When URL hash contains a reportId on back-navigation → refetch
//
// Effects 1 and 2 are responses to user clicks (setGrouping, selectTag).
// They should be in the event handlers, not in effects watching state.
//
// Effect 3 is a legitimate effect — it synchronizes with the URL hash
// (browser navigation events that React doesn't control).
//
// Step 1 (simpler): Just move the refetch calls into the click handlers.
//   - setGrouping handler → also call refetch({ grouping: newGrouping, take: 12 })
//   - selectTag handler → also call refetch({ grouping, entriesForTagId: tagId })
//   This works but has a subtle issue: the handlers close over `grouping` state,
//   so if you change grouping AND select a tag in quick succession, the tag
//   handler uses stale `grouping`.
//
// Step 2 (robust): Introduce the `pendingVariablesRef` pattern to accumulate
//   variables without stale closures. Each handler specifies only what it's
//   changing; the ref remembers the rest.
//
// Refactor: move 1 and 2 into event handlers, keep 3 as an effect.
// ---------------------------------------------------------------------------

type Grouping = "WEEK" | "QUARTER";

interface ReportData {
  entries: Array<{ id: string; label: string; count: number }>;
  tags: Array<{ name: string; count: number }>;
}

// Simulate a Relay-like refetch
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

export const ReportViewerPage: FunctionComponent = () => {
  const [data, setData] = useState<ReportData | null>(null);
  const [grouping, setGrouping] = useState<Grouping>("WEEK");
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Get reportId from URL hash (simulated)
  const hashReportId =
    typeof window !== "undefined"
      ? new URLSearchParams(location.hash.replace(/^#/, "")).get("reportId")
      : null;

  const hasRestoredReportId = useRef(false);

  const refetch = (variables: Record<string, unknown>) => {
    startTransition(() => {
      fetchReportData(variables).then(setData);
    });
  };

  // Anti-pattern: Effect 1 — responds to user clicking a grouping button
  // This should be in the setGrouping handler
  useEffect(() => {
    refetch({
      grouping,
      take: 12,
    });
  }, [grouping]);

  // Anti-pattern: Effect 2 — responds to user selecting a tag
  // This should be in the selectTag handler
  useEffect(() => {
    if (selectedTagId) {
      refetch({
        grouping,
        entriesForTagId: selectedTagId,
      });
    }
  }, [selectedTagId]);

  // Legitimate Effect 3: restores state from URL hash on back-navigation
  useEffect(() => {
    if (hasRestoredReportId.current || !hashReportId) {
      return;
    }
    hasRestoredReportId.current = true;
    refetch({
      grouping,
      entriesForTagId: hashReportId,
    });
  }, [hashReportId]);

  return (
    <div>
      <h1>Exercise 06 — Reports</h1>

      <div>
        <button onClick={() => setGrouping("WEEK")}>Weekly</button>
        <button onClick={() => setGrouping("QUARTER")}>Quarterly</button>
      </div>

      {data && (
        <>
          <h2>Entries</h2>
          {data.entries.map((e) => (
            <button key={e.id} onClick={() => setSelectedTagId(e.id)}>
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
