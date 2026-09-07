import {
  ThemeEditor,
  ThemeEditorWithDraft,
  NotificationSettingsParent,
} from "../../exercises/03-snapshot-key/solution.tsx";

export default function Wrapper() {
  return (
    <>
      <h2>A1: Font Size Picker</h2>
      <ThemeEditor />

      <h2>A2: Font Size Picker with a real draft</h2>
      <p style={{ fontSize: 12, color: "#999" }}>
        The draft survives keystrokes (no commit until blur) and is discarded by the key change on a
        preset click.
      </p>
      <ThemeEditorWithDraft />

      <h2>B: Notification Settings Dialog </h2>
      <p style={{ fontSize: 12, color: "#999" }}>
        Try: toggle some checkboxes, then click "Simulate external update" before saving. The key
        trick remounts with fresh preferences — no stale edits.
      </p>
      <NotificationSettingsParent />
    </>
  );
}
