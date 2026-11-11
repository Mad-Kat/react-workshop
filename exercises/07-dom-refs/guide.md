# Exercise 07: Way to get to the solution

The exercise only told you what the fixed version has to do, and `npm test` checks exactly that list. This is one way there, with the forks along the road where a different choice is just as good.

---

## Exercise A: FancyInput

### Step 1: What does the form actually need?

Two things it can call: `focus` and `clear`. Not `style`, not `value`, not `scrollIntoView`. Write that down as a type, because it is the whole contract between the two components:

```tsx
export interface FancyInputHandle {
  focus: () => void;
  clear: () => void;
}
```

### Step 2: How does FancyInput get a ref from its parent?

Since React 19, `ref` is a regular prop on function components. Add it to the props like any other:

```tsx
export const FancyInput: FunctionComponent<{
  placeholder?: string;
  ref?: Ref<FancyInputHandle>;
}> = ({ placeholder, ref }) => { ... }
```

Before React 19, a function component never saw `ref` in its props. You had to wrap it in `forwardRef((props, ref) => ...)` to get it as a second argument. That still works, and you'll find plenty of it in the codebase, but it's no longer needed and React plans to deprecate it.

### Step 3: What ends up in the parent's ref?

If you pass `ref` straight on to the `<input>`, the parent gets the DOM node: every property and method of an `HTMLInputElement`. That's the full access the exercise rules out.

`useImperativeHandle` lets you put something else in the parent's ref: an object you build. It needs the real `<input>` to do its job, so FancyInput keeps its own ref to it:

```tsx
const inputRef = useRef<HTMLInputElement>(null);

useImperativeHandle(
  ref,
  () => ({
    focus: () => inputRef.current?.focus(),
    clear: () => {
      setValue("");
      inputRef.current?.focus();
    },
  }),
  [],
);

return <input ref={inputRef} ... />;
```

The empty dependency array is honest: `setValue` and `inputRef` keep their identity for the life of the component, so the handle never has to be rebuilt.

### Step 4: Wire up the buttons

```tsx
const fancyInputRef = useRef<FancyInputHandle>(null);

<FancyInput ref={fancyInputRef} placeholder="Type here..." />
<button onClick={() => fancyInputRef.current?.focus()}>Focus</button>
<button onClick={() => fancyInputRef.current?.clear()}>Clear</button>
```

Note where the ref is read: in event handlers. By the time anyone can click a button, the input has been committed and the handle is in place.

### Another road: lift the value

If the form needed to _know_ the value, the React answer would be to lift it: the form owns the state and passes `value` and `onChange` down, and clearing is just setting it to `""`. The exercise rules that out on purpose. An imperative handle is for things that aren't state at all: focus, scroll position, playing a video. `clear()` is on the edge, and it's here because it pairs naturally with `focus()`.

---

## Exercise B: Hint Bubble

### Step 1: Why does the bubble land on the button?

Follow the height:

```tsx
const height = bubbleRef.current?.offsetHeight ?? 0;
```

This runs during render. `HintBubble` is rendering for the first time, so React hasn't created its `<div>` yet, let alone attached it to `bubbleRef`. `bubbleRef.current` is `null`, `height` is `0`, and the bubble is placed 8px above the button's top edge, reaching down over the button. Nothing renders it again while you hover, so it stays there.

This is the rule from the header in action: during render, the DOM you are about to produce doesn't exist yet. Even when it does from an earlier render, it shows what that earlier render produced, not this one. Reading the DOM during render gives you a stale answer or no answer.

### Step 2: Measure after commit

After commit the bubble is in the DOM and can be measured. Measuring after commit is what effects are for. The result has to be rendered, so it goes into state:

```tsx
const [height, setHeight] = useState(0);

useEffect(() => {
  if (bubbleRef.current) {
    setHeight(bubbleRef.current.offsetHeight);
  }
}, []);
```

Hover again. The bubble ends up in the right place, but first you see it on top of the button for a moment.

### Step 3: Why the flash?

The order of events with `useEffect`:

1. render with `height = 0` (slow)
2. commit: the bubble is in the DOM, on top of the button
3. **the browser paints**
4. the effect runs, measures, calls `setHeight`
5. render with the real height (slow again)
6. commit and paint: the bubble jumps above the button

Effects run after the browser has had the chance to paint. That's on purpose: most effects (subscriptions, fetches, logging) have nothing to do with what's on screen, and holding the paint for them would make every update slower. Here it means the unmeasured bubble is on screen for the whole of step 5. Without the busy-wait that is a single frame and easy to miss, but it's there, and on a slow phone it's visible.

### Step 4: useLayoutEffect

`useLayoutEffect` has the same signature and runs at a different moment: after React has written to the DOM, **before** the browser paints. A state update inside it is rendered right away, still before the paint:

1. render with `height = 0`
2. commit: the bubble is in the DOM, on top of the button
3. the layout effect runs, measures, calls `setHeight`
4. render with the real height
5. commit
6. **the browser paints**: the bubble is above the button

The browser only ever paints the final position. Swap `useEffect` for `useLayoutEffect` and the flash is gone.

There's a price: the bubble now shows up after two slow renders instead of one, because the browser waits for both. `useLayoutEffect` blocks painting. That's why the rule of thumb is to default to `useEffect` and use `useLayoutEffect` only when the first frame would otherwise be wrong.

### Why it only flashes on hover

React treats discrete events like click and keydown differently: for those, it runs the `useEffect`s of the update before the browser paints too, so the result of a click doesn't show an intermediate state. Hover is a continuous event and doesn't get that treatment, which is why this exercise uses hover. Don't rely on the click behaviour to hide a flash: the same component, shown by a timer or a data fetch instead, would flash again.

### Another road: a ref callback

A ref callback runs at the same moment as a layout effect, so measuring there works too:

```tsx
const measure = useCallback((node: HTMLDivElement) => setHeight(node.offsetHeight), []);
<div ref={measure} ...>
```

### When you don't need to measure at all

If the bubble only ever went above the button, CSS could do it with no measurement: position the bubble by its `bottom` edge (`bottom: window.innerHeight - targetRect.top + 8`) and let it grow upwards. Flipping below when there's no room is what makes the height necessary. CSS anchor positioning (`position-try-fallbacks`) can do the flip too in browsers that support it. When CSS can do the layout, let CSS do it. `useLayoutEffect` is for when it can't.

---

## Exercise C: Scroll-Safe Input

### Step 1: Why doesn't the listener work?

Look at when the effect runs and what it finds:

```tsx
useEffect(() => {
  const container = containerRef.current;
  if (!container) return;
  ...
}, []);
```

Empty dependencies: it runs once, after the first render. The first render is the closed editor, `Quantity: 2 [Edit]`, and there's no `<div ref={containerRef}>` in it. `containerRef.current` is `null`, the effect returns early, and it never runs again. When you click Edit, the `<div>` appears, React fills in `containerRef`, and nobody is looking.

The ref and the effect are two separate things, and nothing ties the effect to the moment the node appears.

### Step 2: The tempting fix

Add `isEditing` to the dependencies:

```tsx
useEffect(() => { ... }, [isEditing]);
```

It works: every time the editor opens or closes, the effect runs again and finds the `<div>`, or doesn't. But now the effect has to know every reason the `<div>` might come or go. Add a loading state that hides the editor, or move the `<div>` into a child component that decides for itself when to render it, and the effect quietly breaks again. That's what the last line of "Done when" rules out.

### Step 3: A ref callback

Instead of a ref object, `ref` also takes a function. React calls it with the DOM node at the moment it attaches the node, in the same phase as layout effects. Since React 19, the function can return a cleanup, and React calls that when the node is detached:

```tsx
const swallowWheelWhileFocused = (container: HTMLDivElement) => {
  const listener = (event: WheelEvent) => {
    if (container.matches(":focus-within")) {
      event.preventDefault();
    }
  };

  container.addEventListener("wheel", listener, { passive: false });
  return () => container.removeEventListener("wheel", listener);
};

<div ref={swallowWheelWhileFocused}>
```

The listener's lifetime is now the `<div>`'s lifetime, whatever makes the `<div>` appear. No effect, no ref object, no `null` check, and `isEditing` doesn't appear anywhere in it.

About that `null`: before React 19, ref callbacks had no cleanup, so React called them a second time with `null` on detach, and every ref callback started with `if (!node) return`. In React 19 that's still what happens when the callback returns nothing. Return a cleanup function and React calls the cleanup instead, and the callback only ever sees a real node.

### Step 4: Why is it outside the component?

React compares the ref callback with the one from the previous render. If it's a different function, React runs the old cleanup and calls the new callback, even though the node didn't change. A function written inline in the component is a new function on every render, so the listener would be removed and added on every render.

This callback doesn't use any props or state, so it can live at module level and is the same function forever. If it did need something from the component, say an `onWheelBlocked` prop, it would go inside the component wrapped in `useCallback`, with that prop in its dependencies.

### Why `{ passive: false }`

React registers its own `wheel` listener as passive, which means `preventDefault()` in an `onWheel` handler is ignored (the browser warns about it in the console). So `<div onWheel={...}>` can't stop the number from changing, and that's why this is an `addEventListener` call at all and not a JSX prop. `{ passive: false }` makes sure this listener is allowed to call `preventDefault()`.

## Key reading

- [Manipulating the DOM with Refs](https://react.dev/learn/manipulating-the-dom-with-refs)
- [useImperativeHandle](https://react.dev/reference/react/useImperativeHandle)
- [useLayoutEffect](https://react.dev/reference/react/useLayoutEffect)
- [Ref callback cleanup](https://react.dev/reference/react-dom/components/common#ref-callback)
