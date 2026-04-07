# Exercise 03: Way to get to the solution

## How Exercise 03 differs from Exercise 02

In Exercise 02 the state was **redundant**. You could delete it entirely and derive the value from props. The state served no purpose.

In Exercise 03 the state is **legitimate**. The component genuinely needs its own local copy of data. You cannot just delete it. The problem is how that state gets *reset* when the source data changes from the outside.

Keep this distinction in mind as you work through both exercises.

---

## Exercise A: FontSizePicker

### Step 1: What does this component actually do?

Read the component and understand its purpose before looking for bugs. `FontSizePicker` receives a `fontSize` prop from the parent. But the user can also type a custom value into the input. That means the component needs local state (`inputValue`) to hold what the user is typing, independently from what the parent says. The `isFocused` state tracks whether the user is currently typing.

This is different from Exercise 02. In that exercise the state was just a mirror of a prop. Here the state has a real job: it holds the user's in-progress edit.

### Step 2: So what's the effect doing?

```tsx
useEffect(() => {
  setInputValue(fontSize !== null ? String(fontSize) : "");
}, [fontSize]);
```

It takes `fontSize` (a prop) and copies it into `inputValue` (state). Every time the prop changes, the effect "syncs" state to match.

### Step 2: What happens when you click a preset button?

Try it. Click "Small" then "Large". Watch closely.

You should see a flash. The old value appears briefly, then the new value snaps in. Why?

### Step 3: Why does the flash occur?

Think about the order of operations:

1. The parent calls `setSelectedFontSize(18)`, which re-renders and passes `fontSize={18}` to `FontSizePicker`
2. `FontSizePicker` renders. But `inputValue` is still the old value (state hasn't been updated yet)
3. The browser paints the screen with the old value
4. *Then* the `useEffect` fires and calls `setInputValue("18")`
5. A second render happens with the correct value
6. The browser paints again

That's two renders and two paints. The flash is the gap between step 3 and step 6.

### Step 4: So how can you fix it?

The real question is: why does `FontSizePicker` need to "sync" its state to the prop at all? It already receives `fontSize` as a prop. The state exists so the component can hold a draft value while the user is typing. But when the prop changes from the outside (preset button click), you want a fresh start.

Look at the parent, `ThemeEditor`. What if you could tell React to throw away the old `FontSizePicker` and mount a brand new one when the font size changes?

```tsx
<FontSizePicker
  key={selectedFontSize}
  fontSize={selectedFontSize}
  onFontSizeChanged={setSelectedFontSize}
  placeholder="Enter px value"
/>
```

Adding `key={selectedFontSize}` does exactly that. When the key changes, React **unmounts** the old component and **mounts** a new one. The new instance calls `useState(fontSize)` with the current prop. Fresh state, no effect needed.

### Step 5: Now what can you clean up?

If the key trick handles the reset, the `useEffect` that syncs `fontSize` into `inputValue` is unnecessary. Delete it.

### Step 6: Verify

Click the preset buttons again. The flash is gone. The value updates in a single render because `useState` initializes with the correct value on mount. No effect, no second render, no flash.

### Why not useLayoutEffect?

You might notice that `useLayoutEffect` would also fix the flash because it runs before the browser paints. And it does work. But it's a band-aid:

- You still have redundant state that mirrors a prop
- You still have an extra render cycle (effect fires, calls setState, re-render)
- You're hiding the symptom instead of fixing the cause

The `key` trick eliminates the effect entirely. Prefer structural fixes over timing hacks.

---

## Exercise B: NotificationSettingsDialog

### Step 1: What does this component actually do?

Again, start by understanding the purpose. This is an edit dialog. The user opens it, toggles some checkboxes (email, push, sms), and clicks "Save". The component receives the current `preferences` as a prop but needs a local copy (`state`) so that edits don't modify the original until the user confirms.

Ask yourself: is this state redundant like in Exercise 02? No. The dialog genuinely needs a local draft. If you deleted the state and bound the checkboxes directly to the prop, every toggle would immediately save, which defeats the purpose of a "Save" button.

### Step 2: So what's the effect doing?

```tsx
const [state, setState] = useState<NotificationPreferences>(preferences);

useEffect(() => {
  setState(preferences);
}, [preferences]);
```

The effect resets the local draft whenever the source `preferences` changes externally. The intent is "if the underlying data changes, update the draft to match."

### Step 2: What happens when preferences changes externally while you're editing?

Try it. Toggle some checkboxes in the dialog. Then click "Simulate external update".

Your in-progress edits disappear. The effect fires, calls `setState(preferences)`, and silently wipes everything you were doing.

### Step 3: Why does that happen?

The `useEffect` watches `preferences`. When the external update changes `preferences`, the effect fires and resets local state to match. It doesn't know or care that the user was in the middle of editing.

### Step 4: How can you fix this without removing the state?

The state is legitimate. The problem is the reset mechanism. Same insight as Exercise A: instead of syncing state with an effect, let React handle it by remounting.

Look at the parent, `NotificationSettingsParent`. Add a `key` that changes when `preferences` changes:

```tsx
<NotificationSettingsDialog
  key={JSON.stringify(preferences)}
  preferences={preferences}
  updatePreferences={setPreferences}
  onClose={() => setIsOpen(false)}
/>
```

When preferences changes externally, the key changes, React unmounts the old dialog and mounts a fresh one. `useState(preferences)` initializes with the updated preferences. Clean slate.

### Step 5: Why does that fix work?

The dialog only opens on user action, so remounting is safe. The new instance gets a fresh copy of the latest preferences via `useState(preferences)`. No effect needed to keep things in sync.

Now delete the `useEffect` from the dialog. It's no longer needed.

### Step 6: Verify

Toggle some checkboxes. Click "Simulate external update". The dialog remounts with the updated preferences. No silent wipe of in-progress edits (the edits are gone, but so is the old dialog instance). The user sees a clean dialog reflecting the current state, which is the correct behavior when the underlying data changes.

---

## The two flavors

These exercises show the same pattern applied to two situations:

- **Redundant state** (Exercise A): the local state IS the prop. Fix: key trick in the parent, then delete the state sync effect.
- **Editable copy** (Exercise B): the local state is a *draft* of the prop. The state is legitimate, but the effect-based reset is not. Fix: key trick in the parent to remount with fresh state.

In both cases, `useEffect(() => setState(prop), [prop])` causes a double render and is replaceable by `key`.

## Key reading

- [Resetting all state when a prop changes](https://react.dev/learn/you-might-not-need-an-effect#resetting-all-state-when-a-prop-changes)
- [State as a Snapshot](https://react.dev/learn/state-as-a-snapshot)
