import { useState } from "react";
import { ThemeEditor, NotificationSettingsDialog } from "../../exercises/03-snapshot-key/solution.tsx";

export default function Wrapper() {
  const [prefs, setPrefs] = useState({ email: true, push: false, sms: false });

  return (
    <>
      <h2>A: Font Size Picker (key trick)</h2>
      <ThemeEditor />

      <h2>B: Notification Settings Dialog (key trick)</h2>
      <p style={{ fontSize: 12, color: "#999" }}>
        Try: toggle some checkboxes, then click "Simulate external update" before saving.
        The key trick remounts with fresh preferences — no stale edits.
      </p>
      <button
        onClick={() => setPrefs((p) => ({ ...p, sms: !p.sms }))}
        style={{ marginBottom: 8 }}
      >
        Simulate external update (toggle SMS remotely)
      </button>
      <NotificationSettingsDialog
        key={JSON.stringify(prefs)}
        preferences={prefs}
        updatePreferences={setPrefs}
        onClose={() => console.log("Dialog closed")}
      />
    </>
  );
}
