/**
 * Exercise 02: State Shape & Derived State
 * =========================================
 *
 * Mental model: If you can compute it during render, don't put it in state.
 *
 * The components below have redundant state synced via useEffect.
 * For each one:
 *   1. Identify whether the state is redundant
 *   2. Decide: derive inline, remove entirely, or justify keeping it
 *   3. Refactor — remove the effect and derive during render where possible
 *
 * Key reading: https://react.dev/learn/you-might-not-need-an-effect#updating-state-based-on-props-or-state
 *
 * For the TemperatureReading in Exercise A, also revisit the useReducer section
 * from "A Complete Guide to useEffect" (cited in Exercise 01):
 * https://overreacted.io/a-complete-guide-to-useeffect/
 * — "When setting a state variable depends on the current value of another
 * state variable, you might want to try replacing them both with useReducer."
 *
 * For Exercise B, also read: https://react.dev/reference/react/useOptimistic
 */

import type { FunctionComponent } from "react";
import { useEffect, useState } from "react";
import { useRenderCount } from "../useRenderCount";
import { RenderCount } from "../RenderCount";

// ---------------------------------------------------------------------------
// Exercise A: Weather Status Badge
//
// The `badge` state just mirrors the `statusIcon` prop via an effect.
// Is the state needed?
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

  const [badge, setBadge] = useState(statusIcon);

  useEffect(() => setBadge(statusIcon), [statusIcon]);

  if (isStationOffline) {
    if (badge !== "unknown") {
      setBadge("unknown"); // setState during render!
    }
    return <span>Station offline ({badge}) <RenderCount count={renderCount} /></span>;
  }

  if (!forecast) {
    if (badge !== "unknown") {
      setBadge("unknown"); // setState during render!
    }
    return <span>No forecast data ({badge}) <RenderCount count={renderCount} /></span>;
  }

  return <span>Current weather: {badge} <RenderCount count={renderCount} /></span>;
};

// ---------------------------------------------------------------------------
// Exercise A (continued): Temperature Reading
//
// The temperature and unit are coupled — toggling the unit requires converting
// the temperature value. The current code uses an effect with a "previous unit"
// tracking variable to detect changes.
//
// From "A Complete Guide to useEffect" (cited in Exercise 01):
// "When setting a state variable depends on the current value of another
// state variable, you might want to try replacing them both with useReducer."
//
// 1. Identify the redundant state (prevUnit)
// 2. Refactor: replace the coupled useState + effect with a single useReducer
// ---------------------------------------------------------------------------

export const TemperatureReading: FunctionComponent<{
  initialCelsius: number;
}> = ({ initialCelsius }) => {
  const renderCount = useRenderCount();

  const [temperature, setTemperature] = useState(initialCelsius);
  const [unit, setUnit] = useState<"C" | "F">("C");
  const [prevUnit, setPrevUnit] = useState<"C" | "F">("C");

  // Anti-pattern: effect detects unit change via redundant prevUnit state
  // and converts temperature. setTemperature depends on the current unit.
  useEffect(() => {
    if (unit !== prevUnit) {
      if (unit === "F") {
        setTemperature((t) => t * (9 / 5) + 32);
      } else {
        setTemperature((t) => (t - 32) * (5 / 9));
      }
      setPrevUnit(unit);
    }
  }, [unit, prevUnit]);

  return (
    <div>
      <span>
        {temperature.toFixed(1)}°{unit}
      </span>
      <button onClick={() => setUnit(unit === "C" ? "F" : "C")}>
        Switch to °{unit === "C" ? "F" : "C"}
      </button>
      <RenderCount count={renderCount} />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Exercise B: Notification Preference Toggle
//
// `isEnabled` mirrors remote data from `channel`, synced via effect.
// But it's also set optimistically in the mutation callback.
// Is this one redundant? Or is there a reason to keep it?
//
// Hint: There IS a reason to keep optimistic state here, but the effect
// is still an anti-pattern. The solution uses useOptimistic — a React
// hook purpose-built for exactly this pattern.
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
  const initialEnabled =
    channel?.preference?.emailNotificationsEnabled || false;

  const [isEnabled, setIsEnabled] = useState(initialEnabled);

  useEffect(() => {
    setIsEnabled(initialEnabled);
  }, [channel, initialEnabled]);

  const togglePreference = () => {
    const shouldEnable = !isEnabled;
    setIsEnabled(shouldEnable);
    // Simulate server mutation — onMutate updates the "server" state
    setTimeout(() => onMutate(shouldEnable), 500);
  };

  return { isEnabled, togglePreference };
}
