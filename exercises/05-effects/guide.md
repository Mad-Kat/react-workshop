# Exercise 05: Way to get to the solution

### Start by reading the component top to bottom

You see three `useState` calls, four `useEffect` calls, and a click handler. That is a lot of effects for a component this size. Two of them don't need to be effects at all. But how do you tell which ones?

Let's look at each one and ask: what is this effect actually doing? And could we express the same thing _without_ an effect?

### Effect A: What does this effect do?

```tsx
const [totalRate, setTotalRate] = useState(room.ratePerGuest * guests);
useEffect(() => {
  setTotalRate(liveRate * guests);
}, [liveRate, guests]);
```

It watches `liveRate` and `guests`, then writes their product into `totalRate` state.

### Step 1: Could you do this without an effect?

Look at what the effect actually does. It reads `liveRate` and `guests` (both already available in the component) and writes their product into state. There is no API call, no subscription, no DOM access. It is just math.

What if you wrote this instead?

```tsx
const totalRate = liveRate * guests;
```

Why is this better? The effect version fires after the render, calls `setTotalRate`, and triggers a second render. The inline version computes the value in the same render cycle. One render instead of two. Watch the RenderCount drop after you make this change.

### Effect B: What does this effect do?

```tsx
const [confirmed, setConfirmed] = useState(false);
useEffect(() => {
  if (confirmed) {
    trackEvent("booking_confirmed", { roomId: room.id, guests, totalRate });
    onConfirm?.({ roomId: room.id, guests, totalRate });
    setConfirmed(false);
  }
}, [confirmed, room.id, guests, totalRate, onConfirm]);
```

It watches a `confirmed` flag. When the flag flips to `true`, it fires an analytics event, calls the `onConfirm` callback from the parent, and resets the flag.

### Step 3: Could you do this without an effect?

Look at where `confirmed` gets set to `true`:

```tsx
const handleConfirmBooking = () => {
  setConfirmed(true);
};
```

That is a click handler. The user clicks a button, and the component sets a flag, which triggers an effect, which does the actual work. The flag is just an unnecessary detour.

### Step 4: Where does the work actually belong?

The user action already happened. You know exactly when to respond: in the click handler itself.

```tsx
const handleConfirmBooking = () => {
  const data = { roomId: room.id, guests, totalRate };
  trackEvent("booking_confirmed", data);
  onConfirm?.(data);
};
```

Delete the `confirmed` state and the effect. The handler does the work directly.

### Step 5: "But what if the component doesn't know what should happen on confirm?"

Good question. Maybe analytics is optional. Maybe the parent needs to do something the component shouldn't know about. That's exactly what the `onConfirm` callback is for. The component calls it; the parent decides what to do.

The key insight is that the _response to a user action_ belongs at the call site of that action (the handler), not in an effect watching a flag. Whether the handler calls `trackEvent`, `onConfirm`, both, or neither is a composition decision. The effect-with-a-flag pattern doesn't make this any more flexible. It just adds indirection and an extra render cycle.

### Step 5b: "What if the caller and the responder are in completely different parts of the tree?"

Sometimes the component with the button and the code that needs to react are not in a parent/child relationship at all. You can't pass a callback prop because there's no direct path between them.

The answer is still not an effect watching a flag. The options are:

- **Lift the handler to a common ancestor** and pass it down via props or context. The component calls `onConfirm`, the ancestor routes it to whoever needs it.
- **Use a context that provides a callback.** An analytics provider wraps a section of the tree. The component calls `useAnalytics().track(...)` in its handler. The provider decides what to do. The call is still synchronous with the user action.
- **Use a shared event bus or store action.** Something like a Zustand store action or a custom EventEmitter. The handler dispatches an event; a listener elsewhere reacts. This is explicit pub/sub, not a hidden reactive chain through React state.

All of these preserve the principle: the user action triggers a synchronous call chain. The work happens because someone _called a function_, not because a state variable changed and an effect noticed. That distinction matters because effects run after render, can be batched or deferred, and create invisible dependencies. A function call is immediate and traceable.

### Step 5c: "What about impression tracking?"

Not every analytics call is a response to a user action. Impression tracking fires when a component becomes visible on screen. There is no click, no submit, no handler to put it in. The component mounts, and you need to report that it was seen.

That IS a legitimate effect. But "component mounted" doesn't mean "user saw it." The component could be below the fold, hidden behind a tab, or inside a collapsed accordion. A more accurate approach uses an IntersectionObserver to detect when the element is actually visible in the viewport:

```tsx
useEffect(() => {
  const el = ref.current;
  if (!el) return;

  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      trackEvent("product_viewed", { roomId: room.id });
      observer.disconnect(); // only track once
    }
  });

  observer.observe(el);
  return () => observer.disconnect();
}, [room.id]);
```

This is the same category as Effects C and D. The external system is the browser's IntersectionObserver API. The effect sets up the observer, and the cleanup tears it down. No flag state, no indirection.

The rule is: if there is a user action that causes the work, use the handler. If the work is triggered by something the component _observes from an external system_ (visibility, resize, a subscription), that is what effects are for.

### Effect C: What does this effect do?

```tsx
useEffect(() => {
  const unsubscribe = subscribeToLiveRateUpdates(room.id, (newScore) => {
    setLiveRate(newScore);
  });
  return unsubscribe;
}, [room.id]);
```

It subscribes to a live rate data source and cleans up when the room changes or the component unmounts.

### Step 6: Could you do this without an effect?

No. The component needs to subscribe to a live data source that pushes updates. React doesn't know about this subscription. The effect sets up the connection, and the cleanup function tears it down. You can't express this as inline computation or move it into a handler because there is no user action triggering it. The data arrives from outside.

### Effect D: What does this effect do?

```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setGuests(1);
    }
  };
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, []);
```

It attaches a keyboard listener to `window` and cleans up on unmount.

### Step 7: Could you do this without an effect?

No. React doesn't own `window.addEventListener`. The component needs to reach outside React's world to register a listener on a browser API. The effect sets it up, the cleanup removes it. This cannot be expressed as a derivation or moved into a click handler.

### Verify

After refactoring Effects A and B, run the exercise and compare the RenderCount. Removing the derivation effect eliminates one extra render cycle per state change. Removing the flag state eliminates the render from `setConfirmed(true)` plus the render from `setConfirmed(false)`.

### The pattern that emerges

Look at what you just did. For each effect, you asked "could I express this without an effect?" Effects A and B could: one was just math, the other was a response to a click. Effects C and D could not: they connect to things outside React (a subscription, a browser API).

That's the rule. An effect is the right tool when your component needs to synchronize with something external that React doesn't control. If the work is just computation from existing values, or a direct response to a user action, it doesn't need an effect.

## Key reading

- [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- [Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects)
