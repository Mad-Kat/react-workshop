/**
 * Exercise 02: State Shape & Derived State — SOLUTIONS
 * =====================================================
 */

import type { FunctionComponent } from "react";
import { useOptimistic, useReducer, useTransition } from "react";
import { useRenderCount } from "../useRenderCount";
import { RenderCount } from "../RenderCount";

// ---------------------------------------------------------------------------
// Solution A: Weather Status Badge
//
// The `badge` state was completely redundant — it just mirrored the prop.
// Worse, `setBadge` was called during render (a React anti-pattern).
// Fix: derive the badge inline based on props.
// ---------------------------------------------------------------------------

type WeatherStatusIcon = "sunny" | "cloudy" | "rainy" | "unknown";

interface WeatherStatusBadgeProps {
  statusIcon: WeatherStatusIcon;
  isStationOffline?: boolean;
  forecast: { hasData: boolean } | null;
}

export const WeatherStatusBadge: FunctionComponent<WeatherStatusBadgeProps> = ({
  statusIcon,
  isStationOffline = false,
  forecast,
}) => {
  const renderCount = useRenderCount();

  // Derive the badge based on props — no state needed
  const badge: WeatherStatusIcon = isStationOffline
    ? "unknown"
    : !forecast
      ? "unknown"
      : statusIcon;

  if (isStationOffline) {
    return <span>Station offline ({badge}) <RenderCount count={renderCount} /></span>;
  }

  if (!forecast) {
    return <span>No forecast data ({badge}) <RenderCount count={renderCount} /></span>;
  }

  return <span>Current weather: {badge} <RenderCount count={renderCount} /></span>;
};

// ---------------------------------------------------------------------------
// Solution A (continued): Temperature Reading
//
// The coupled useState + effect is replaced by a single useReducer.
// The reducer atomically handles the unit toggle + temperature conversion.
// prevUnit state is eliminated entirely — no more effect.
//
// Why useReducer?
// From "A Complete Guide to useEffect":
// "When setting a state variable depends on the current value of another
// state variable, you might want to try replacing them both with useReducer."
//
// Bonus: dispatch is stable (never changes identity), so any effect that
// only needs to dispatch won't need state variables in its dependency array.
// ---------------------------------------------------------------------------

type TemperatureState = { temperature: number; unit: "C" | "F" };

type TemperatureAction =
  | { type: "toggleUnit" }
  | { type: "setTemperature"; value: number };

function temperatureReducer(
  state: TemperatureState,
  action: TemperatureAction,
): TemperatureState {
  switch (action.type) {
    case "toggleUnit":
      return state.unit === "C"
        ? { temperature: state.temperature * (9 / 5) + 32, unit: "F" }
        : { temperature: (state.temperature - 32) * (5 / 9), unit: "C" };
    case "setTemperature":
      return { ...state, temperature: action.value };
  }
}

export const TemperatureReading: FunctionComponent<{
  initialCelsius: number;
}> = ({ initialCelsius }) => {
  const renderCount = useRenderCount();

  const [{ temperature, unit }, dispatch] = useReducer(temperatureReducer, {
    temperature: initialCelsius,
    unit: "C",
  });

  return (
    <div>
      <span>
        {temperature.toFixed(1)}°{unit}
      </span>
      <button onClick={() => dispatch({ type: "toggleUnit" })}>
        Switch to °{unit === "C" ? "F" : "C"}
      </button>
      <RenderCount count={renderCount} />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Solution B: Notification Preference Toggle
//
// The effect syncing `isEnabled` with `initialEnabled` was the anti-pattern —
// it caused a double-render every time `channel` changed.
//
// useOptimistic is the right tool here: it holds an optimistic value while
// a transition is in flight, then automatically settles on the server truth
// when `serverEnabled` updates.
//
// Key: useOptimistic only holds the value during a transition. We use
// startTransition with an async function that awaits the mutation.
//
// Docs: https://react.dev/reference/react/useOptimistic
// ---------------------------------------------------------------------------

interface NotificationChannel {
  id: string;
  preference: { emailNotificationsEnabled: boolean } | null;
}

export function useNotificationPreference(
  channel: NotificationChannel | null,
  onMutate: (enabled: boolean) => void,
) {
  const serverEnabled =
    channel?.preference?.emailNotificationsEnabled || false;

  const [optimisticEnabled, setOptimisticEnabled] =
    useOptimistic(serverEnabled);

  const [, startTransition] = useTransition();

  const togglePreference = () => {
    const shouldEnable = !optimisticEnabled;

    startTransition(async () => {
      // Set optimistic value — visible immediately
      setOptimisticEnabled(shouldEnable);
      // Await the "server" mutation — transition stays pending until this resolves
      await new Promise<void>((resolve) =>
        setTimeout(() => {
          onMutate(shouldEnable);
          resolve();
        }, 500),
      );
      // When the transition settles, useOptimistic reverts to the new
      // serverEnabled (which onMutate just updated), confirming the change.
    });
  };

  return { isEnabled: optimisticEnabled, togglePreference };
}

// ---------------------------------------------------------------------------
// Real codebase references:
//   - libraries/product-availability/src/availabilityLegacy.tsx: state mirroring prop
//   - libraries/product-updates-notifications/src/productDetailPage/useSubscribeToPriceChange.tsx: state mirroring Relay data
// ---------------------------------------------------------------------------
