# Exercise 03: Way to get to the solution

## How Exercise 03 differs from Exercise 02

In Exercise 02 the state was **redundant**. You could delete it entirely and derive the value from props. The state served no purpose.

In Exercise 03 the state is **legitimate**. The component genuinely needs its own local copy of data. You cannot just delete it. The problem is how that state gets _reset_ when the source data changes from the outside.

Keep this distinction in mind as you work through both exercises.

---

## Exercise A: FontSizePicker

### Step 1: What does this component actually do?

Read the component and understand its purpose before looking for bugs. `FontSizePicker` receives a `fontSize` prop from the parent. But the user can also type a custom value into the input. That means the component needs local state (`inputValue`) to hold what the user is typing, independently from what the parent says.

This is different from Exercise 02. In that exercise the state was just a mirror of a prop. Here the state has a real job: it holds the user's in-progress edit.

### Step 2: So what's the effect doing?

```tsx
useEffect(() => {
  setInputValue(fontSize !== null ? String(fontSize) : "");
}, [fontSize]);
```

It takes `fontSize` (a prop) and copies it into `inputValue` (state). Every time the prop changes, the effect "syncs" state to match.

### Step 3: What happens when you click a preset button?

Try it. Click "Small", then "Large", then "Medium". Watch the render counter next to the input.

It goes up by **two** on every click. One click, two renders. Why?

### Step 4: Why two renders?

Think about the order of operations:

1. The parent calls `setSelectedFontSize(18)`, which re-renders and passes `fontSize={18}` to `FontSizePicker`
2. `FontSizePicker` renders. But `inputValue` is still the old value — state hasn't been updated yet, and this render sees the old snapshot
3. _Then_ the `useEffect` fires and calls `setInputValue("18")`
4. A second render happens, this time with the correct value

The first render is wasted work. It computed and returned UI based on a value the component already knew was out of date.

> **A note on the "flash."** You will find this anti-pattern described as causing a visible flash of the old value, and on older React versions it did: the browser painted after step 2 and again after step 4. Modern React usually flushes the passive effect before the next paint, so on a small component like this one you typically see no flash at all — just the extra render. Don't go hunting for a flicker that isn't there. The wasted render is the real, measurable problem, and it _does_ become visible once the subtree is big enough that the two renders straddle a frame boundary. This is why the counter is a better instrument than your eyes.
>
> React Scan shows the same thing: the input lights up twice per click, not once.

### Step 5: So how can you fix it?

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

### Step 6: Now what can you clean up?

If the key trick handles the reset, the `useEffect` that syncs `fontSize` into `inputValue` is unnecessary. Delete it.

### Verify

Click the preset buttons again and watch the counter. It now reads `renders: 1` after every click, and stays there — because the `key` change mounts a brand new component each time, and `useState` initializes with the correct value on mount. One render, no effect, no stale snapshot.

That reset-to-1 is itself worth noticing: it's direct evidence that you're getting a new component instance rather than an updated one.

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

### Step 3: What happens when preferences changes externally while you're editing?

Try it. Toggle some checkboxes in the dialog. Then click "Simulate external update".

Your in-progress edits disappear. The effect fires, calls `setState(preferences)`, and silently wipes everything you were doing.

### Step 4: Why does that happen?

The `useEffect` watches `preferences`. When the external update changes `preferences`, the effect fires and resets local state to match. It doesn't know or care that the user was in the middle of editing.

### Step 5: How can you fix this without removing the state?

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

### Step 6: Why does that fix work?

The dialog only opens on user action, so remounting is safe. The new instance gets a fresh copy of the latest preferences via `useState(preferences)`. No effect needed to keep things in sync.

Now delete the `useEffect` from the dialog. It's no longer needed.

One difference from Exercise A is worth naming here. There, the change came from a preset button — an event in the parent — so the handler could have done both updates itself. Here the update arrives from outside the component entirely; that's the whole point of "simulate external update". There is no event handler to hang the reset on, which is why `key` (or a render-time adjustment) is the tool.

### Verify

Toggle some checkboxes. Click "Simulate external update". The dialog remounts with the updated preferences. No silent wipe of in-progress edits (the edits are gone, but so is the old dialog instance). The user sees a clean dialog reflecting the current state, which is the correct behavior when the underlying data changes.

---

## The two flavors

These exercises show the same pattern applied to two situations:

- **Redundant state** (Exercise A): the local state IS the prop. Fix: key trick in the parent, then delete the state sync effect.
- **Editable copy** (Exercise B): the local state is a _draft_ of the prop. The state is legitimate, but the effect-based reset is not. Fix: key trick in the parent to remount with fresh state.

In both cases, `useEffect(() => setState(prop), [prop])` causes a double render and is replaceable by `key`.

---

## Side notes

Three questions that come up once both parts are done.

### Why not useLayoutEffect?

You might notice that `useLayoutEffect` would also remove any paint-visible gap, because it runs before the browser paints. And it does work. But it's a band-aid:

- You still have redundant state that mirrors a prop
- You still have an extra render cycle (effect fires, calls setState, re-render)
- You're hiding the symptom instead of fixing the cause

The `key` trick eliminates the effect entirely. Prefer structural fixes over timing hacks.

### `key` is not always the right tool

`key` is the right answer for both components above, but it isn't free and it isn't the only option. Four approaches, in the order you should reach for them:

**1. Do it where the event happens.** In Exercise A the preset click already knows that two things need to change. If the parent owned the draft string, the handler could set both at once and nothing would need to sync afterwards:

```tsx
const selectPreset = (size: number) => {
  setSelectedFontSize(size);
  setInputValue(String(size));
};
```

No effect, no key, no remount. This is the same move as Exercise 02: when one event causes two changes, make both changes in that event. It only works when the change starts from an event you control — true for A's preset buttons, and not true for B, where the update arrives from outside.

**2. `key`, when you want to reset all of the state.** What you did in both parts. Cheap to write and hard to get wrong, but it throws away the whole subtree: DOM nodes, every piece of state in every child, scroll position, focus. On one input that costs nothing. On a large form, or a list whose children are expensive to mount, the remount _is_ the cost.

**3. Adjust state during render, when you want to reset part of it.** When `key` is too blunt (you want to reset one field, not all of them) or too expensive, React's documented alternative is to set state during rendering, guarded by a comparison against the previous prop:

```tsx
const [prevFontSize, setPrevFontSize] = useState(fontSize);
if (fontSize !== prevFontSize) {
  setPrevFontSize(fontSize);
  setInputValue(fontSize !== null ? String(fontSize) : "");
}
```

This looks illegal and isn't. React throws away the returned JSX and immediately re-renders the same component, before it touches the DOM and before the children render. The children never see the stale value and nothing paints in between, which is why it beats the effect. Two rules come attached: the guard condition is what stops it from looping, and you may only set _this_ component's state this way. Setting another component's state during render is an error.

Watch the ordering, though. React's own guidance puts `key` and plain derivation _above_ this pattern, not below it: "although this pattern is more efficient than an Effect, most components shouldn't need it either" ([React docs](https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)). Efficiency and clarity are separate axes here. A component that adjusts its own state mid-render is harder to follow than one that simply remounted. Reach for it when you have a measured remount cost or genuinely need to keep part of the state, not by default.

**4. An effect.** The option this whole exercise exists to talk you out of.

### Would React Compiler fix this?

It comes up every time, and the answer is no.

The compiler memoizes. It inserts the equivalent of `useMemo`, `useCallback`, and `React.memo` so that a render does less work. It does not restructure your components: it won't delete an effect, won't move state to a different owner, and won't add a `key`.

That matters here because the extra render in this exercise is not a memoization problem. Nothing is recomputing something expensive. The second render exists because `setInputValue` runs in an effect after the commit, and a scheduled state update _is_ a render. Memoization can make a render cheaper; it cannot cancel one that `setState` asked for.

The scope point is the second half of the answer. The fix for both components lives in the _parent_ — pass a `key`, or let the parent own the draft and set both values in the click handler. That's a change to how two components share data, and the compiler explicitly doesn't reason at that level: "React Compiler's memoization is not shared across multiple components or hooks" ([React docs](https://react.dev/learn/react-compiler/introduction)). It optimizes each component in isolation, which is exactly the wrong altitude for a problem whose solution is a different split of responsibility between parent and child.

Useful framing for the discussion: the compiler is very good at the work you'd otherwise do by hand with `useMemo`. It has nothing to say about state that shouldn't exist in the first place. Those are different problems, and only one of them is automatable.

## Key reading

- [Resetting all state when a prop changes](https://react.dev/learn/you-might-not-need-an-effect#resetting-all-state-when-a-prop-changes)
- [Adjusting some state when a prop changes](https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
- [State as a Snapshot](https://react.dev/learn/state-as-a-snapshot)
