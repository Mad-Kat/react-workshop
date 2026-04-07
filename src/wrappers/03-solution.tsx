import { ThemeEditor, NotificationSettingsParent } from "../../exercises/03-snapshot-key/solution.tsx";

export default function Wrapper() {
  return (
    <>
      <h2>A: Font Size Picker (key trick)</h2>
      <ThemeEditor />

      <h2>B: Notification Settings Dialog (key trick)</h2>
      <p style={{ fontSize: 12, color: "#999" }}>
        Try: toggle some checkboxes, then click "Simulate external update" before saving.
        The key trick remounts with fresh preferences — no stale edits.
      </p>
      <NotificationSettingsParent />
    </>
  );
}
