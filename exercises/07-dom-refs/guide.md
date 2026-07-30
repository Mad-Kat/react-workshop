# Exercise 07: Way to get to the solution

## Exercise A: FancyInput with useImperativeHandle

### Start by reading the requirements

The parent component needs to call `.focus()` and `.clear()` on the input. But it should NOT have access to the full DOM node. You need a controlled API boundary.

### Step 1: What does the parent actually need from this component?

Two methods: `focus` and `clear`. Nothing else. Not `style`, not `value`, not `scrollIntoView`. Just those two. Write that as a TypeScript interface:

```tsx
interface FancyInputHandle {
  focus: () => void;
  clear: () => void;
}
```

This is the contract. The parent gets exactly these methods and nothing more.

### Step 2: How do you accept a ref from the parent?

In React 19, `ref` is just a regular prop. No `forwardRef` wrapper needed. Add it to the props type:

```tsx
const FancyInput: FunctionComponent<{
  placeholder?: string;
  ref?: Ref<FancyInputHandle>;
}> = ({ placeholder, ref }) => { ... }
```

### Step 3: How do you expose those methods instead of the raw DOM node?

You need two refs: one internal `useRef<HTMLInputElement>` for the actual DOM node (so you can call `.focus()` on it), and the external `ref` prop that the parent passes in. `useImperativeHandle` bridges the two:

```tsx
const inputRef = useRef<HTMLInputElement>(null);

useImperativeHandle(ref, () => ({
  focus: () => inputRef.current?.focus(),
  clear: () => { setValue(""); inputRef.current?.focus(); },
}), []);
```

The parent calls `ref.current.focus()`, and `useImperativeHandle` routes that to `inputRef.current.focus()`. The parent never sees the underlying `<input>` element.

### Step 4: Now the parent needs to measure the input width. How?

The `FancyInputHandle` ref only exposes `focus()` and `clear()`. There is no DOM access through it. You need a separate container ref in the parent:

```tsx
const containerRef = useRef<HTMLDivElement>(null);
```

Wrap the `<FancyInput>` in a `<div ref={containerRef}>`, then query the input inside.

### Step 5: Which hook do you use for measurement?

Try `useEffect` first, and log the measurement into the provided paint timeline:

```tsx
useEffect(() => {
  const input = containerRef.current?.querySelector("input");
  if (input) {
    const width = input.getBoundingClientRect().width;
    recordTimelineEvent(`measured ${width}px`);
    setInputWidth(width);
  }
}, []);
```

Reload and read the timeline. You'll (usually) see:

```
1. render (width: measuring…)
2. browser paints frame 1        ← the user saw "measuring…"
3. measured 142px
4. render (width: 142px)
5. browser paints frame 2        ← only now do they see the width
```

Frame 1 was painted **before** your measurement ran. The user's first frame showed "measuring…" — that's a flash, even if it's one frame and your eyes can't catch it. Don't go hunting for a visible flicker (on a fast machine there's nothing to see, and React sometimes even manages to flush the effect before the paint — the order with `useEffect` is simply *not guaranteed*). The timeline is the instrument, not your eyes.

### Step 6: What if the intermediate state must never be painted?

`useLayoutEffect` runs after DOM mutation but **before the browser paints** — guaranteed. Switch the hook, reload, and compare:

```
1. render (width: measuring…)
2. measured 142px
3. render (width: 142px)
4. browser paints frame 1        ← first frame already has the width
```

"measured" now always lands before "browser paints frame 1". The "measuring…" state exists in memory but is never painted. That guarantee is the whole difference: `useEffect` runs *around* paint at React's discretion; `useLayoutEffect` blocks paint until it's done — which is also why it must stay fast.

Rule of thumb: default to `useEffect`. Only reach for `useLayoutEffect` when an intermediate state must never reach the user's eyes.

### Verify

Wire up the Focus and Clear buttons to `fancyInputRef.current?.focus()` and `fancyInputRef.current?.clear()`. Confirm that clicking Focus moves the cursor to the input, clicking Clear empties the input and focuses it, and — with `useLayoutEffect` — the paint timeline shows "measured" before "browser paints frame 1" on every reload.

---

## Exercise B: Ref callback with cleanup

### Step 1: Reproduce the bug first

Click "Show advanced settings", focus the number input, and scroll over it. **The value changes.** The wheel listener that should prevent this was never attached.

### Step 2: Trace why the listener is missing

The code pairs a `useRef` with a `useEffect`:

```tsx
const containerRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const container = containerRef.current;
  if (!container) return;   // ← the effect bails out here

  // ...attach wheel listener...
}, []);
```

The effect runs once, on mount — while the panel is still collapsed. The `<div ref={containerRef}>` doesn't exist yet, so `containerRef.current` is `null` and the effect returns early. When you later expand the panel, the div appears in the DOM — but nothing re-runs the effect. The ref and the effect are decoupled: the effect's timing is tied to the component's lifecycle, not to the node's.

### Step 3: What if you could attach the listener at the exact moment the node appears in the DOM?

That is what a ref callback does. Instead of passing a ref object, you pass a function. React calls that function with the DOM node when it attaches — whenever that happens, mount or later:

```tsx
const attachContainer = useCallback((node: HTMLDivElement) => {
  const listener = (e: WheelEvent) => {
    if (node.matches(":focus-within")) {
      e.preventDefault();
    }
  };

  node.addEventListener("wheel", listener, { passive: false });

  return () => node.removeEventListener("wheel", listener);
}, []);
```

No `useEffect`. No timing gap. No null check. The listener is attached the instant React puts the node in the DOM. When React detaches the node (collapse the panel), it calls the returned cleanup function.

In React 19, when the callback returns a cleanup function, React uses that for detach and never calls the callback with `null`. (Callbacks that don't return a cleanup still get the legacy call-with-`null` on detach, for backwards compatibility.)

### Step 4: Why is useCallback important here?

Without `useCallback`, the callback function is recreated on every render. React sees a new function reference and calls the old cleanup, then calls the new callback. That means the listener is detached and reattached on every render. Wrapping it in `useCallback` with `[]` deps ensures the function is stable and React only calls it when the node actually attaches or detaches.

### Verify

Replace the `useRef` + `useEffect` with the ref callback pattern and pass `attachContainer` as the `ref` prop on the conditional `<div>`. Expand the panel, focus the input, scroll — the value must no longer change. Collapse and re-expand the panel to confirm attach/cleanup keep working across toggles.

## Key reading

- [Manipulating the DOM with Refs](https://react.dev/learn/manipulating-the-dom-with-refs)
- [useLayoutEffect](https://react.dev/reference/react/useLayoutEffect)
