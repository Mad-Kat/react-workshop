/**
 * Exercise 03: State as a Snapshot & the Key Trick — SOLUTIONS
 * =============================================================
 */

import type { FunctionComponent } from "react";
import { useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Solution A: FontSizePicker
//
// Option 1 (preferred): Remove the local state and effect entirely.
// The parent owns the font size — use the prop directly for display.
// For intermediate typing state (before the value is valid), use an
// uncontrolled input with a ref so we avoid calling onFontSizeChanged
// on every keystroke.
//
// Option 2: Use `key={selectedFontSize}` from the parent (ThemeEditor)
// to remount the picker when the preset changes, giving it fresh state.
// ---------------------------------------------------------------------------

interface FontSizePickerProps {
  /** font size in px, e.g. 14 */
  fontSize: number | null;
  onFontSizeChanged: (fontSize: number | null) => void;
  placeholder: string;
}

// Option 1: Remove local state and effect, use prop directly
export const FontSizePicker: FunctionComponent<FontSizePickerProps> = ({
  fontSize,
  onFontSizeChanged,
  placeholder,
}) => {
  // For intermediate typing state, use an uncontrolled input with a ref
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <input
      ref={inputRef}
      type="number"
      defaultValue={fontSize !== null ? String(fontSize) : ""}
      placeholder={placeholder}
      onChange={(e) => {
        const raw = e.currentTarget.value;
        const parsed = parseFloat(raw);
        if (!isNaN(parsed) && parsed > 0) {
          onFontSizeChanged(parsed);
        } else if (raw === "") {
          onFontSizeChanged(null);
        }
      }}
    />
  );
};

// Option 2: Parent uses key to force remount on preset change
export const ThemeEditor: FunctionComponent = () => {
  const [selectedFontSize, setSelectedFontSize] = useState<number | null>(14);

  const presets = [
    { id: "1", size: 12, label: "Small" },
    { id: "2", size: 14, label: "Medium" },
    { id: "3", size: 18, label: "Large" },
  ];

  return (
    <div>
      <h2>Font size</h2>
      {presets.map((preset) => (
        <button
          key={preset.id}
          onClick={() => setSelectedFontSize(preset.size)}
        >
          {preset.label}
        </button>
      ))}

      {/* key={selectedFontSize} forces remount — fresh state on every preset change */}
      <FontSizePicker
        key={selectedFontSize}
        fontSize={selectedFontSize}
        onFontSizeChanged={setSelectedFontSize}
        placeholder="Enter px value"
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Solution B: Notification Settings Dialog
//
// The effect IS legitimate here — this is the "editable copy" pattern.
// But the effect-based reset is fragile: if preferences changes externally
// while the dialog is open, the user's in-progress edits are silently wiped.
//
// Better: use `key` from the parent to remount the dialog when preferences
// changes. The dialog only opens on user action, so remounting is safe and
// gives it a fresh copy of preferences each time it opens.
// ---------------------------------------------------------------------------

interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
}

interface NotificationSettingsProps {
  preferences: NotificationPreferences;
  updatePreferences: (newPreferences: NotificationPreferences) => void;
  onClose: () => void;
}

// The dialog itself is now simple — no effect needed.
// The parent uses `key={JSON.stringify(preferences)}` to remount on change.
export const NotificationSettingsDialog: FunctionComponent<NotificationSettingsProps> =
  ({ preferences, updatePreferences, onClose }) => {
    // Fresh copy on mount — no effect sync needed
    const [state, setState] = useState<NotificationPreferences>(preferences);

    const preferencesHaveChanged =
      JSON.stringify(preferences) !== JSON.stringify(state);

    const toggleChannel = (channel: keyof NotificationPreferences) => {
      setState({ ...state, [channel]: !state[channel] });
    };

    const saveSettings = () => {
      updatePreferences(state);
      onClose();
    };

    return (
      <div>
        <h3>Notification Settings</h3>
        {(Object.keys(state) as Array<keyof NotificationPreferences>).map(
          (channel) => (
            <label key={channel}>
              <input
                type="checkbox"
                checked={state[channel]}
                onChange={() => toggleChannel(channel)}
              />
              {channel}
            </label>
          ),
        )}
        <button onClick={saveSettings} disabled={!preferencesHaveChanged}>
          Save
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>
    );
  };

// Parent renders with key:
// <NotificationSettingsDialog key={JSON.stringify(preferences)} preferences={preferences} ... />

// ---------------------------------------------------------------------------
// Real codebase references:
//   - domains/archived-orders/src/overview/datePicker.tsx: effect-based reset on prop change
//   - domains/cookie-compliance/src/settings/dialog/useCookieSettingsHelper.tsx: editable copy with effect sync
//
// Key takeaways:
//   1. Setting state doesn't mutate the variable — the current render always
//      sees a snapshot. The new value is only visible in the next render.
//   2. `useEffect(() => setState(prop), [prop])` causes a double-render (flash)
//      and is almost always replaceable by `key` or derived state.
//   3. `key` on a component tells React to throw away the old instance and
//      mount a fresh one. Use it to reset all state at once when a controlling
//      value changes.
// ---------------------------------------------------------------------------
