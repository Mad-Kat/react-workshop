/**
 * Exercise 03: State as a Snapshot & the Key Trick
 * =================================================
 *
 * Mental model: Setting state doesn't change the variable — it requests a
 * re-render with a new value. The current render always sees a snapshot.
 *
 * If you get stuck, open guide.md for step-by-step thinking.
 *
 * Key reading: https://react.dev/learn/you-might-not-need-an-effect#resetting-all-state-when-a-prop-changes
 */

import type { FunctionComponent } from "react";
import { useEffect, useState } from "react";
import { useRenderCount } from "../useRenderCount";
import { RenderCount } from "../RenderCount";

// ---------------------------------------------------------------------------
// Exercise A: FontSizePicker
//
// Run the exercise. Click "Small", then "Large", then "Medium" — and watch the
// render counter. It goes up by TWO on every click.
//
// The component renders once with the OLD value, then the effect fires and
// renders it again with the new one. The first render is wasted work built on
// a stale snapshot.
//
// Find the bug. Fix it. Then clean up whatever becomes unnecessary.
// The counter tells you when you've got it.
// ---------------------------------------------------------------------------

interface FontSizePickerProps {
  /** font size in px, e.g. 14 */
  fontSize: number | null;
  onFontSizeChanged: (fontSize: number | null) => void;
  placeholder: string;
}

export const FontSizePicker: FunctionComponent<FontSizePickerProps> = ({
  fontSize,
  onFontSizeChanged,
  placeholder,
}) => {
  const renderCount = useRenderCount();
  const [inputValue, setInputValue] = useState<string>(
    fontSize !== null ? String(fontSize) : "",
  );

  // Anti-pattern: effect-based reset
  useEffect(() => {
    setInputValue(fontSize !== null ? String(fontSize) : "");
  }, [fontSize]);

  return (
    <>
      <input
        type="number"
        value={inputValue}
        placeholder={placeholder}
        onChange={(e) => {
          const raw = e.currentTarget.value;
          setInputValue(raw);
          const parsed = parseFloat(raw);
          if (!isNaN(parsed) && parsed > 0) {
            onFontSizeChanged(parsed);
          } else if (raw === "") {
            onFontSizeChanged(null);
          }
        }}
      />
      <RenderCount count={renderCount} />
    </>
  );
};

// Parent that uses FontSizePicker — this is where you might apply the key trick
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

      <FontSizePicker
        fontSize={selectedFontSize}
        onFontSizeChanged={setSelectedFontSize}
        placeholder="Enter px value"
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Exercise B: Notification Preferences Dialog
//
// This dialog keeps an editable copy of preferences. Click "Simulate
// external update" while editing — what happens to your changes?
//
// The local state is legitimate (it's a draft). But the reset mechanism
// is wrong. Fix it without removing the state.
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

export const NotificationSettingsDialog: FunctionComponent<NotificationSettingsProps> =
  ({ preferences, updatePreferences, onClose }) => {
    const [state, setState] = useState<NotificationPreferences>(preferences);

    // Anti-pattern: effect-based reset. If the user is editing toggles
    // and preferences changes externally, their changes are silently wiped.
    useEffect(() => {
      setState(preferences);
    }, [preferences]);

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

// Parent that uses NotificationSettingsDialog
// Step 3 hint: where should the key go?
export const NotificationSettingsParent: FunctionComponent = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: true,
    push: false,
    sms: false,
  });
  const [isOpen, setIsOpen] = useState(true);

  // Simulate external preference update
  const simulateExternalUpdate = () => {
    setPreferences((prev) => ({ ...prev, push: !prev.push }));
  };

  return (
    <div>
      <button onClick={simulateExternalUpdate}>
        Simulate external update
      </button>
      <button onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? "Close" : "Open"} dialog
      </button>
      {isOpen && (
        <NotificationSettingsDialog
          preferences={preferences}
          updatePreferences={setPreferences}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

