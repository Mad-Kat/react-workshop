import { useReducer } from "react";
import { Playlist, AccordionSection, ActivityFeed } from "../../exercises/05-dependency-contract/exercise.tsx";

type PanelAction = { type: "open" | "close"; panel: string };

function panelReducer(state: Record<string, boolean>, action: PanelAction) {
  return { ...state, [action.panel]: action.type === "open" };
}

export default function Wrapper() {
  const [panels, dispatch] = useReducer(panelReducer, { details: false });

  return (
    <>
      <h2>A: Playlist</h2>
      <Playlist tracks={[<span key="1">Track One</span>, <span key="2">Track Two</span>, <span key="3">Track Three</span>]}>
        <p>Now playing</p>
      </Playlist>
      <h2>B: Accordion Section</h2>
      <AccordionSection panelId="details" isOpen={!!panels.details} dispatch={dispatch} labelText="Details" />
      <h2>C: Activity Feed</h2>
      <ActivityFeed channelId="general" />
    </>
  );
}
