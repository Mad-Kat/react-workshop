# Exercise 03: Way to get to the solution

## How Exercise 03 differs from Exercise 02

In Exercise 02 the state was **redundant**. You could delete it entirely and derive the value from props. The state served no purpose.

Exercise 03 is about the case where the state is **legitimate**: the component genuinely needs its own local copy of data, you cannot just delete it, and the problem is how that copy gets _reset_ when the source data changes from the outside.

A1 is the warm-up, and it is deliberately the easy case — its state turns out to be redundant after all, and most people fix it by deleting the state outright. That answer is correct. A2 and B are the same shape with the escape hatch removed: there the local copy has to stay, and `key` is what resets it.

Keep this distinction in mind as you work through the three parts.

---

## Exercise A1: FontSizePicker

### Step 1: What does this component actually do?

Read the component and understand its purpose before looking for bugs. `FontSizePicker` receives a `fontSize` prop from the parent. But the user can also type a custom value into the input, so the component keeps local state (`inputValue`) for what the user is typing.

At least, that's the story the code tells. Hold on to the question of whether the state really earns its keep here — Step 5 comes back to it.

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

The real question is: why does `FontSizePicker` need to "sync" its state to the prop at all? It already receives `fontSize` as a prop.

**The short answer: it doesn't.** Look closely at the `onChange` handler — every keystroke calls `onFontSizeChanged`, so the parent is told immediately and `inputValue` is never anything other than `String(fontSize)`. The state is redundant. Delete the effect _and_ the `useState`, and bind the input straight to the prop:

```tsx
<input type="number" value={fontSize !== null ? String(fontSize) : ""} ... />
```

One render per click, no effect, and focus survives. This is the same move as Exercise 02, and it is the right one here: when state is redundant, deleting it beats resetting it. Most participants find this fix, and it's the one to keep.

**The other answer** is worth walking through anyway, because it's the tool A2 and B will need. Suppose you wanted to keep the state — a fresh copy on every prop change, without an effect. Look at the parent, `ThemeEditor`. What if you could tell React to throw away the old `FontSizePicker` and mount a brand new one when the font size changes?

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

Either way, the `useEffect` that syncs `fontSize` into `inputValue` is now unnecessary. Delete it. If you took the first route, the `useState` goes with it.

### Verify

Click the preset buttons again and watch the counter. Both fixes get you one render per click instead of two, and they look quite different:

- **Deleted the state:** the counter climbs by exactly one per click. Same component instance, updated. Typing keeps focus, because nothing remounts.
- **Used `key`:** the counter reads `renders: 1` after every click and stays there, because a brand new instance is mounted each time and `useState` initializes from the current prop. That reset-to-1 is direct evidence of a remount.

Now type into the `key` version and watch what that remount costs. Every keystroke calls `onFontSizeChanged`, which changes `selectedFontSize`, which changes the key — so the input is unmounted and remounted **on every character**, and focus lands back on the document body. You type one digit and have to click back into the field for the next one.

That is not a working component, and it's the sharpest possible argument for the first fix: keying on the value you are editing is self-defeating when every keystroke changes that value. The deleted-state version has no such problem — type into it and the caret stays put, character after character.

Measure it rather than trusting your eyes. `document.activeElement` after one keystroke is `BODY` in the `key` version and the `<input>` in the deleted-state version. And don't read anything into focus after a _preset click_: focus moves to the button you clicked, in both versions, because that's what clicking a button does. The telling case is typing.

Keep the observation. A2 is the same picker with the commit moved to blur, which is precisely what makes `key={selectedFontSize}` viable there.

Now go to A2, which is the same picker with the deletion route closed off.

---

## Exercise A2: FontSizePicker with a real draft

### Step 1: What changed?

The same picker, with one difference: it no longer calls `onFontSizeChanged` on every keystroke. `onChange` only updates the local draft, and the value is committed to the parent on **blur** or **Enter**.

```tsx
onChange={(e) => setInputValue(e.currentTarget.value)}
onBlur={commit}
```

That one change makes `inputValue` a genuine draft. Between two commits it holds strings the parent cannot hold at all: `"1."` while you're typing a decimal, `""` while you're clearing the field, `"abc"` if you typo.

### Step 2: Try the A1 fix

Delete the `useState` and bind `value` to the prop, exactly as in A1.

Now try to type `1.5`. You can't. The moment you type the `.`, the value round-trips through `fontSize` as the number `1`, and the input shows `1` again. Try to clear the field: it snaps back. The prop is a `number | null` and the draft is a string — they are not the same information, and the string is the one the user is currently editing.

Put the state back. **This state is legitimate.** Only the reset mechanism is wrong.

### Step 3: Fix the reset

Same tool as A1's second answer, and now it's the only one:

```tsx
<FontSizeDraftPicker
  key={selectedFontSize}
  fontSize={selectedFontSize}
  onFontSizeChanged={setSelectedFontSize}
  placeholder="Enter px value"
/>
```

Then delete the `useEffect`.

### Step 4: Why the commit-on-blur detail matters

Notice what the key is keyed on: `selectedFontSize`, the value being edited. In A1 that would have remounted the component on **every keystroke**, because every keystroke committed a new value. Here the value only changes on blur or on a preset click, so:

- typing never remounts — the draft survives, `1.` and all
- committing your own edit doesn't disturb you, you've already left the field
- a preset click changes the value from the outside, the key changes, and the draft is discarded

A `key` is only as good as the thing you key it on. It should identify the _occasion to reset_, not merely change often. If the value did change on every keystroke, you'd key on something that marks the preset click instead (a counter, or the preset id).

### Verify

Type `1.5` and watch the counter — it climbs one render per keystroke and never resets, because you're editing one instance. Then click a preset: the counter drops back to `renders: 1` and the input shows the preset value. One render, no effect, draft correctly thrown away.

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

These exercises show the same effect applied to three situations, and the fix is not the same in all three:

- **Redundant state** (A1): the local state IS the prop, because every keystroke is reported upward immediately. Fix: delete the state and control the input from the parent. `key` also works, but it's a heavier answer to a lighter problem.
- **Draft state** (A2): the local state holds strings the parent cannot represent (`"1."`, `""`) because the value is only committed on blur. It cannot be deleted. Fix: `key` in the parent, so a value change discards the draft.
- **Editable copy** (B): the local state is a draft of a whole object, and the update arrives from outside the component, so there's no event handler to hang the reset on. Fix: `key` in the parent to remount with fresh state.

In all three, `useEffect(() => setState(prop), [prop])` causes a double render on a stale snapshot. Only in A1 is the answer to remove the state itself; when the state has to stay, `key` replaces the effect.

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

`key` is the right answer for A2 and B, and the second-best answer for A1 — but it isn't free and it isn't the only option. Four approaches, in the order you should reach for them:

**0. Delete the state.** If the local copy is always equal to the prop, there is nothing to reset. This is A1, and it's why most participants never needed `key` there. Check for it first; the remaining three only apply once you've established that the state has to exist.

**1. Do it where the event happens.** In A2 the preset click already knows that two things need to change. If the parent owned the draft string, the handler could set both at once and nothing would need to sync afterwards:

```tsx
const selectPreset = (size: number) => {
  setSelectedFontSize(size);
  setInputValue(String(size));
};
```

No effect, no key, no remount. This is the same move as Exercise 02: when one event causes two changes, make both changes in that event. It only works when the change starts from an event you control — true for A2's preset buttons, and not true for B, where the update arrives from outside. The cost is that the draft moves up to the parent, which now carries a string it doesn't otherwise care about.

**2. `key`, when you want to reset all of the state.** What you did in A2 and B. Cheap to write and hard to get wrong, but it throws away the whole subtree: DOM nodes, every piece of state in every child, scroll position, focus. On one input that costs nothing. On a large form, or a list whose children are expensive to mount, the remount _is_ the cost.

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
