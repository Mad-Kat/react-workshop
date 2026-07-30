# Exercise 02: Way to get to the solution

## Exercise A: WeatherStatusBadge

### Start by reading the component top to bottom

You see a `useState`, a `useEffect`, and then two `if` blocks with early returns. Something feels off but it's not immediately obvious what.

### Step 1: What values can `badge` actually hold?

Trace every code path:
- The `useState(statusIcon)` initializes it to whatever `statusIcon` is
- The `useEffect` sets it to `statusIcon` whenever `statusIcon` changes
- The first `if` block sets it to `"unknown"` when the station is offline
- The second `if` block sets it to `"unknown"` when there's no forecast
- Otherwise it stays as `statusIcon`

So `badge` is either `statusIcon` or `"unknown"`. That's it.

### Step 2: What determines which one it is?

Look at the conditions:
- If `isStationOffline` → `"unknown"`
- If `!forecast` → `"unknown"`
- Otherwise → `statusIcon`

All of these are **props**. The value of `badge` is fully determined by the props that arrive on each render.

### Step 3: So why is it in state at all?

If you can write `badge` as a function of props alone, there's no reason for it to be a `useState`. State is for values that change over time *independently* of props. This one doesn't. It's just a mirror.

Try writing it as a single expression:

```tsx
const badge = isStationOffline ? "unknown" : !forecast ? "unknown" : statusIcon;
```

That's the entire computation. No `useState`, no `useEffect`, no `setBadge` calls during render.

### Step 4: Why does this fix the RenderCount?

The old version had a `useEffect` that called `setBadge`. Effects run *after* the render and paint. So React would:
1. Render with the old `badge` value
2. Paint to the screen
3. Run the effect, which calls `setBadge`
4. Re-render with the new `badge` value
5. Paint again

That's two renders per prop change. The derived version computes `badge` during the first render. One render, one paint, done.

The `setBadge("unknown")` calls during render were even worse. Calling `setState` during render forces React to immediately restart the render before finishing. The derived version eliminates all of this.

### Verify

After the fix, `useState` and `useEffect` are both gone and `badge` is a plain derived expression. Change the props that drive the badge (station offline, missing forecast) and watch the RenderCount badge: it should now increase by one per prop change instead of two, because there is no effect-driven second render.

---

## Exercise B: TemperatureReading

### Start by listing the state

There are three `useState` calls:
- `temperature` (the numeric value)
- `unit` ("C" or "F")
- `prevUnit` ("C" or "F")

And there's a `useEffect` that compares `unit` to `prevUnit` and converts the temperature when they differ.

### Step 1: Why does `prevUnit` exist?

The effect needs to know whether the unit *changed*. But `useEffect` doesn't give you the previous value of a dependency. So the code introduces a third state variable just to track "what was the unit last time?"

This is a code smell. A separate state variable exists only to detect a change in another state variable.

### Step 2: When does `unit` change?

Only when the user clicks the toggle button. That's a single event: `onClick={() => setUnit(...)}`

But changing the unit also requires converting the temperature. The current code does this in an effect. The effect fires *after* the render, which means there's a moment where `unit` is "F" but `temperature` is still in Celsius.

### Step 3: Can these two changes happen together?

The problem is that `setUnit` and `setTemperature` are separate calls, and the conversion logic is split across the click handler and the effect. What if you could update both values in a single, atomic operation?

One approach: just move both `setState` calls into the click handler.

```tsx
const handleToggle = () => {
  if (unit === "C") {
    setTemperature(t => t * (9/5) + 32);
    setUnit("F");
  } else {
    setTemperature(t => (t - 32) * (5/9));
    setUnit("C");
  }
};
```

React 18+ batches these automatically, so they produce a single re-render. The effect and `prevUnit` are gone. This works and is the simplest fix.

### Step 4: When would you reach for useReducer instead?

The handler approach works for two variables. But notice that the conversion logic *depends on the current state* of both `unit` and `temperature`. If the state shape grows (more units, more derived values, undo support), the handler becomes a sprawling conditional.

`useReducer` centralizes the state transitions:

```tsx
function reducer(state, action) {
  switch (action.type) {
    case "toggleUnit":
      return state.unit === "C"
        ? { temperature: state.temperature * (9/5) + 32, unit: "F" }
        : { temperature: (state.temperature - 32) * (5/9), unit: "C" };
  }
}
```

Now `toggleUnit` is a single action that atomically computes the next state from the current state. No separate effect, no `prevUnit`, no risk of the two values getting out of sync.

The bonus: `dispatch` is referentially stable (its identity never changes), which makes it safe to use in dependency arrays without causing re-runs.

### Verify

After either fix, `prevUnit` is gone, the `useEffect` is gone, and the RenderCount should decrease. The toggle button click now produces one render instead of two.

---

## Key reading

- [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- [A Complete Guide to useEffect](https://overreacted.io/a-complete-guide-to-useeffect/) (useReducer section)
