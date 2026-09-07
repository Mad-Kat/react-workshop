/**
 * Exercise 03: State as a Snapshot & the Key Trick — SOLUTIONS
 * =============================================================
 */

import type { FunctionComponent } from "react";
import { useState } from "react";
import { useRenderCount } from "../useRenderCount";
import { RenderCount } from "../RenderCount";

// ---------------------------------------------------------------------------
// Solution A1: FontSizePicker
//
// The ONLY change inside FontSizePicker: delete the useEffect.
// The real fix is in the parent: `key={selectedFontSize}`.
//
// When the key changes, React unmounts the old FontSizePicker and mounts
// a new one. useState(fontSize) initializes with the current prop value.
// No effect, no second render.
//
// The render counter now resets to 1 on every preset click, because the
// component is a brand new instance. In the exercise version it climbed by
// two per click and never reset.
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
  const [inputValue, setInputValue] = useState<string>(fontSize !== null ? String(fontSize) : "");

  // No useEffect needed — key trick handles the reset

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

// The fix: key={selectedFontSize} in the parent
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
        <button key={preset.id} onClick={() => setSelectedFontSize(preset.size)}>
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
// Solution A1, the other answer (and the one most participants find)
//
// The state in A1 is redundant: the input commits on every keystroke, so
// `inputValue` is always just `String(fontSize)`. Delete the effect AND the
// state, bind the input to the prop, and the component becomes plainly
// controlled by the parent:
//
//   export const FontSizePicker = ({ fontSize, onFontSizeChanged, placeholder }) => (
//     <input
//       type="number"
//       value={fontSize !== null ? String(fontSize) : ""}
//       placeholder={placeholder}
//       onChange={(e) => { ...same parse, no setInputValue... }}
//     />
//   );
//
// No effect, no key, no remount — and focus survives typing. That last part is
// not a nicety: in the key version above, every keystroke commits a new
// fontSize, so the key changes on every keystroke, the input remounts, and
// focus is lost after each character. Verified in the browser: type one digit
// and document.activeElement is BODY. Demo the key version on the preset
// buttons, not by typing.
//
// This is the better fix for A1, and it's the same lesson as Exercise 02:
// when state is redundant, deleting it beats resetting it. React's own
// ordering agrees — derive or lift first, reach for `key` after that.
//
// Accept it, then send them to A2, where the state can't be deleted.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Solution A2: FontSizePicker with a real draft
//
// Here the A1 fix is not available. The value is committed on blur, so while
// you type, `inputValue` holds strings the parent cannot represent — "1.",
// "", "abc". Bind the input to the prop and decimals become untypable.
// The state is legitimate; only the reset mechanism is wrong.
//
// Fix: delete the effect, and let the parent remount with `key={fontSize}`.
// Because the commit happens on blur rather than on every keystroke, the key
// only changes when the value actually changes — typing doesn't remount, so
// the draft survives keystrokes and is discarded on preset clicks. That is
// exactly the reset you want.
//
// Counter: 1 render per preset click, resetting each time (new instance).
// ---------------------------------------------------------------------------

export const FontSizeDraftPicker: FunctionComponent<FontSizePickerProps> = ({
  fontSize,
  onFontSizeChanged,
  placeholder,
}) => {
  const renderCount = useRenderCount();
  const [inputValue, setInputValue] = useState<string>(fontSize !== null ? String(fontSize) : "");

  // No useEffect needed — key trick handles the reset

  const commit = () => {
    const raw = inputValue.trim();
    const parsed = Number(raw);
    if (raw === "") {
      onFontSizeChanged(null);
    } else if (Number.isFinite(parsed) && parsed > 0) {
      onFontSizeChanged(parsed);
    } else {
      // Invalid draft: throw it away in the event handler that caused it.
      setInputValue(fontSize !== null ? String(fontSize) : "");
    }
  };

  return (
    <>
      <input
        type="text"
        inputMode="decimal"
        value={inputValue}
        placeholder={placeholder}
        onChange={(e) => setInputValue(e.currentTarget.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit();
          }
        }}
      />
      <RenderCount count={renderCount} />
    </>
  );
};

// The fix: key={selectedFontSize} in the parent
export const ThemeEditorWithDraft: FunctionComponent = () => {
  const [selectedFontSize, setSelectedFontSize] = useState<number | null>(14);

  const presets = [
    { id: "1", size: 12, label: "Small" },
    { id: "2", size: 14, label: "Medium" },
    { id: "3", size: 18, label: "Large" },
  ];

  return (
    <div>
      <h2>Font size (draft, committed on blur)</h2>
      {presets.map((preset) => (
        <button key={preset.id} onClick={() => setSelectedFontSize(preset.size)}>
          {preset.label}
        </button>
      ))}

      {/* key={selectedFontSize} discards the draft whenever the value changes */}
      <FontSizeDraftPicker
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
export const NotificationSettingsDialog: FunctionComponent<NotificationSettingsProps> = ({
  preferences,
  updatePreferences,
  onClose,
}) => {
  // Fresh copy on mount — no effect sync needed
  const [state, setState] = useState<NotificationPreferences>(preferences);

  const preferencesHaveChanged = JSON.stringify(preferences) !== JSON.stringify(state);

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
      {(Object.keys(state) as Array<keyof NotificationPreferences>).map((channel) => (
        <label key={channel}>
          <input type="checkbox" checked={state[channel]} onChange={() => toggleChannel(channel)} />
          {channel}
        </label>
      ))}
      <button onClick={saveSettings} disabled={!preferencesHaveChanged}>
        Save
      </button>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
};

// The fix: key={JSON.stringify(preferences)} in the parent remounts on change
export const NotificationSettingsParent: FunctionComponent = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: true,
    push: false,
    sms: false,
  });
  const [isOpen, setIsOpen] = useState(true);

  const simulateExternalUpdate = () => {
    setPreferences((prev) => ({ ...prev, push: !prev.push }));
  };

  return (
    <div>
      <button onClick={simulateExternalUpdate}>Simulate external update</button>
      <button onClick={() => setIsOpen(!isOpen)}>{isOpen ? "Close" : "Open"} dialog</button>
      {isOpen && (
        <NotificationSettingsDialog
          key={JSON.stringify(preferences)}
          preferences={preferences}
          updatePreferences={setPreferences}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Key takeaway
//   Each render sees a snapshot: setting state doesn't change the variable
//   you're currently looking at.
//   `useEffect(() => setState(prop), [prop])` therefore renders twice, the
//   first time on a stale value. Reset with `key`, or in the event handler
//   that caused the change. See guide.md for when `key` is the wrong tool.
// ---------------------------------------------------------------------------
