/**
 * Exercise 06: The Dependency Contract
 * ======================================
 *
 * Mental model: The linter doesn't suggest dependencies — it discovers them.
 * You can't choose them; you can only prove something isn't reactive.
 *
 * Each example below has a dependency issue. Diagnose and fix each one.
 *
 * Key reading: https://react.dev/learn/removing-effect-dependencies
 *
 */

import type { FunctionComponent, ReactNode } from "react";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
// Note: useCallback is imported for your solution — you may need it
import { useRenderCount } from "../useRenderCount";
import { RenderCount } from "../RenderCount";

// ---------------------------------------------------------------------------
// Exercise A: useMemo that never caches
//
// `selectTrack` is a plain function recreated every render.
// It's in the useMemo deps, so the memo re-runs every render.
// The contextValue is new every render → all consumers re-render.
//
// Fix it so the context value is stable.
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

  // Problem: this function is recreated every render
  const selectTrack = (newIndex: number) => {
    setActiveTrack(newIndex);
    onTrackChange?.(newIndex);
  };

  // Problem: selectTrack is new every render → useMemo re-runs every render
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
// Exercise B: Effect with object dependency that causes infinite loop
//
// The effect depends on `options`, which is an object created during render.
// Every render creates a new object reference → effect re-runs → state
// update → re-render → infinite loop.
//
// Fix it.
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

  // Problem: new object every render
  const options = {
    limit: 20,
    sort: "desc" as const,
    channelId,
  };

  useEffect(() => {
    // Simulates fetching feed entries
    const fetchEntries = async () => {
      console.log("Fetching with options:", options);
      const result: FeedEntry[] = [
        { id: "1", text: `Entry in ${options.channelId}`, timestamp: Date.now() },
      ];
      setEntries(result);
    };

    fetchEntries();
    // Problem: options is new every render → infinite loop
  }, [options]);

  return (
    <div>
      <RenderCount count={renderCount} />
      {entries.map((entry) => (
        <p key={entry.id}>{entry.text}</p>
      ))}
    </div>
  );
};
