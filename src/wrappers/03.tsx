import {
  ThemeEditor,
  ThemeEditorWithDraft,
  NotificationSettingsParent,
} from "../../exercises/03-snapshot-key/exercise.tsx";

export default function Wrapper() {
  return (
    <>
      <h2>A1: Font Size Picker</h2>
      <ThemeEditor />

      <h2>A2: Font Size Picker with a real draft</h2>
      <p style={{ fontSize: 12, color: "#999" }}>
        Try: type "1.5" — the draft only commits on blur or Enter. The A1 fix (deleting the state)
        is not available here.
      </p>
      <ThemeEditorWithDraft />

      <h2>B: Notification Settings Dialog</h2>
      <p style={{ fontSize: 12, color: "#999" }}>
        Try: toggle some checkboxes, then click "Simulate external update" before saving. The
        effect-based reset silently wipes your in-progress edits.
      </p>
      <NotificationSettingsParent />
    </>
  );
}
