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

Try `useEffect` first:

```tsx
useEffect(() => {
  const input = containerRef.current?.querySelector("input");
  if (input) {
    setInputWidth(input.getBoundingClientRect().width);
  }
}, []);
```

This fires after the browser paints. The sequence is: render, paint "measuring...", measure, call `setInputWidth`, repaint with the width. The user briefly sees "measuring..." before the width appears.

### Step 6: What if you cannot tolerate that flash?

`useLayoutEffect` runs after DOM mutation but before the browser paints. The sequence becomes: render, measure, call `setInputWidth`, then paint once with the correct width. No flash.

```tsx
useLayoutEffect(() => {
  const input = containerRef.current?.querySelector("input");
  if (input) {
    setInputWidth(input.getBoundingClientRect().width);
  }
}, []);
```

Rule of thumb: default to `useEffect`. Only reach for `useLayoutEffect` when you need to measure or mutate the DOM before the user sees anything.

> **Tip:** if you do not see a flash with `useEffect`, open Chrome DevTools, go to Performance, set CPU to 6x slowdown, and try again. The flash becomes visible on slower hardware.

### Verify

Wire up the Focus and Clear buttons to `fancyInputRef.current?.focus()` and `fancyInputRef.current?.clear()`. Confirm that clicking Focus moves the cursor to the input, clicking Clear empties the input and focuses it, and the width displays without a flash.

---

## Exercise B: Ref callback with cleanup

### Start by reading the current ScrollSafeInput code

You see a `useRef` paired with a `useEffect`:

```tsx
const containerRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const container = containerRef.current;
  if (!container) return;

  const listener = (event: WheelEvent) => {
    if (container.matches(":focus-within")) {
      event.preventDefault();
    }
  };

  container.addEventListener("wheel", listener, { passive: false });
  return () => container.removeEventListener("wheel", listener);
}, []);
```

### Step 7: What is the problem with this approach?

The effect runs on mount. It reads `containerRef.current` and, if the node exists, attaches the listener. But the ref and the effect are decoupled. If the DOM node is not attached when the effect runs (for example, if the component is conditionally rendered and the condition is initially false), `containerRef.current` is `null` and the listener is never attached. There is no mechanism to retry when the node finally appears.

### Step 8: What if you could attach the listener at the exact moment the node appears in the DOM?

That is what a ref callback does. Instead of passing a ref object, you pass a function. React calls that function with the DOM node when it attaches.

In React 19, the callback is only ever called with the actual node. It is never called with `null`. Detach is handled by returning a cleanup function (same pattern as `useEffect`):

```tsx
const containerRef = useCallback((node: HTMLDivElement) => {
  const listener = (e: WheelEvent) => {
    if (node.matches(":focus-within")) {
      e.preventDefault();
    }
  };

  node.addEventListener("wheel", listener, { passive: false });

  return () => node.removeEventListener("wheel", listener);
}, []);
```

No `useEffect`. No timing gap. No null check. The listener is attached the instant React puts the node in the DOM. When React detaches the node, it calls the returned cleanup function.

### Step 9: Why is useCallback important here?

Without `useCallback`, the callback function is recreated on every render. React sees a new function reference and calls the old cleanup, then calls the new callback. That means the listener is detached and reattached on every render. Wrapping it in `useCallback` with `[]` deps ensures the function is stable and React only calls it when the node actually attaches or detaches.

### Verify

Replace the `useRef` + `useEffect` with the ref callback pattern. Pass `containerRef` as the `ref` prop on the `<div>`. Confirm that scrolling over the number input while it is focused does not change the value, and that the listener is properly cleaned up when the component unmounts.

## Key reading

- [Manipulating the DOM with Refs](https://react.dev/learn/manipulating-the-dom-with-refs)
- [useLayoutEffect](https://react.dev/reference/react/useLayoutEffect)
