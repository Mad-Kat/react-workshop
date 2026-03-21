/**
 * Exercise 03: State as a Snapshot & the Key Trick
 * =================================================
 *
 * Mental model: Setting state doesn't change the variable — it requests a
 * re-render with a new value. The current render always sees a snapshot.
 *
 * These components use `useEffect(() => setState(...), [prop])` to reset
 * state when props change. Fix them using the `key` trick or by removing
 * the redundant state.
 *
 * Key reading: https://react.dev/learn/you-might-not-need-an-effect#resetting-all-state-when-a-prop-changes
 *
 */

import type { FunctionComponent } from "react";
import { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Exercise A: FontSizePicker
//
// When the `fontSize` prop changes (e.g. parent selects a different preset),
// the effect resets `inputValue`. But there's a flash — the old value
// renders first, then the effect fires on the next render.
//
// Fix this so the component resets cleanly when `fontSize` changes.
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
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState<string>(
    fontSize !== null ? String(fontSize) : "",
  );

  // Anti-pattern: effect-based reset
  useEffect(() => {
    setInputValue(fontSize !== null ? String(fontSize) : "");
  }, [fontSize]);

  return (
    <input
      type="number"
      value={isFocused ? inputValue : (fontSize !== null ? String(fontSize) : "")}
      placeholder={placeholder}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
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
// `state` is an editable copy of `preferences` (from context). The effect
// resets `state` when `preferences` changes externally. But if the dialog is
// open and the user is editing, the reset silently wipes their changes.
//
// Is this effect redundant? Or is it legitimate?
// What's a better pattern?
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

