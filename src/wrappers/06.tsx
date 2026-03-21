import { Playlist, ActivityFeed } from "../../exercises/06-dependency-contract/exercise.tsx";

export default function Wrapper() {
  return (
    <>
      <h2>A: Playlist (useMemo that never caches)</h2>
      <Playlist tracks={[<span key="1">Track One</span>, <span key="2">Track Two</span>, <span key="3">Track Three</span>]}>
        <p>Now playing</p>
      </Playlist>
      <h2>B: Activity Feed (infinite loop)</h2>
      <ActivityFeed channelId="general" />
    </>
  );
}
