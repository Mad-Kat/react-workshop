/**
 * Exercise 06: The Dependency Contract — SOLUTIONS
 * ==================================================
 */

import type { FunctionComponent, ReactNode } from "react";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRenderCount } from "../useRenderCount";
import { RenderCount } from "../RenderCount";

// ---------------------------------------------------------------------------
// Solution A: Playlist context with stable selectTrack
//
// Fix: wrap `selectTrack` in useCallback so it's not recreated every render.
// The useMemo then caches properly.
// ---------------------------------------------------------------------------

interface PlaylistContextValue {
  tracks: ReactNode[];
  trackCount: number;
  activeTrack: number;
  selectTrack: (index: number) => void;
  isBuffering: boolean;
}

const PlaylistContext = createContext<PlaylistContextValue | null>(null);

interface PlaylistProps {
  tracks: ReactNode[];
  onTrackChange?: (index: number) => void;
  children: ReactNode;
}

export const Playlist: FunctionComponent<PlaylistProps> = ({
  tracks,
  children,
  onTrackChange,
}) => {
  const [activeTrack, setActiveTrack] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const trackCount = tracks.length;

  // Fix: wrap in useCallback so it's stable across renders
  const selectTrack = useCallback(
    (newIndex: number) => {
      setActiveTrack(newIndex);
      onTrackChange?.(newIndex);
    },
    [onTrackChange],
  );

  // Now the useMemo actually caches — selectTrack is stable
  const contextValue = useMemo(
    () => ({
      tracks,
      trackCount,
      activeTrack,
      selectTrack,
      isBuffering,
    }),
    [tracks, trackCount, activeTrack, selectTrack, isBuffering],
  );

  return (
    <PlaylistContext value={contextValue}>
      {children}
    </PlaylistContext>
  );
};

// ---------------------------------------------------------------------------
// Solution B: ActivityFeed — fix the infinite loop
//
// The object in the dependency array was recreated every render.
// Fix: destructure into primitive values for the dependency array.
// ---------------------------------------------------------------------------

interface FeedEntry {
  id: string;
  text: string;
  timestamp: number;
}

export const ActivityFeed: FunctionComponent<{
  channelId: string;
}> = ({ channelId }) => {
  const renderCount = useRenderCount();
  const [entries, setEntries] = useState<FeedEntry[]>([]);

  // Option 1: Use primitive values in the dep array (preferred)
  const limit = 20;
  const sort = "desc" as const;

  useEffect(() => {
    const fetchEntries = async () => {
      console.log("Fetching with options:", { limit, sort, channelId });
      const result: FeedEntry[] = [
        { id: "1", text: `Entry in ${channelId}`, timestamp: Date.now() },
      ];
      setEntries(result);
    };

    fetchEntries();
    // Primitive values — no reference equality issues
  }, [channelId, limit, sort]);

  // Option 2 (alternative): move the constant config outside the component
  // const OPTIONS = { limit: 20, sort: "desc" } as const;
  // Then only depend on [channelId] in the effect

  return (
    <div>
      <RenderCount count={renderCount} />
      {entries.map((entry) => (
        <p key={entry.id}>{entry.text}</p>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// >> INSTRUCTOR: React 19.2 introduced `useEffectEvent` — it creates a stable
// >> function that reads the latest values without being a dependency. This is
// >> the official solution for "I need fresh values inside an effect but don't
// >> want the effect to re-run when they change." Show this as the modern
// >> alternative to the ref-based workarounds in Exercise C's Option 2.
// >>
// >> Example:
// >>   const onTick = useEffectEvent(() => { console.log(count); });
// >>   useEffect(() => { const id = setInterval(onTick, 1000); return () => clearInterval(id); }, []);
// >>   // onTick always reads the latest `count` but is NOT a dependency
//
// Real codebase references:
//   - segments/carousel-solo-slide/src/carousel.tsx: useMemo with unstable function dep
//   - domains/product-detail/src/blocks/lib/expandableContentWrapper.tsx: useCallback with missing deps
// ---------------------------------------------------------------------------
