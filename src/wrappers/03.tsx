import {
  ThemeEditor,
  NotificationSettingsParent,
} from "../../exercises/03-snapshot-key/exercise.tsx";

export default function Wrapper() {
  return (
    <>
      <h2>A: Font Size Picker</h2>
      <ThemeEditor />

      <h2>B: Notification Settings Dialog</h2>
      <p style={{ fontSize: 12, color: "#999" }}>
        Try: toggle some checkboxes, then click "Simulate external update" before saving. The
        effect-based reset silently wipes your in-progress edits.
      </p>
      <NotificationSettingsParent />
    </>
  );
}
