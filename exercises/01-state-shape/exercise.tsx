/**
 * Exercise 01: State Shape & Derived State
 * =========================================
 *
 * Mental model: If you can compute it during render, don't put it in state.
 *
 * Both components below have redundant state synced via useEffect.
 * For each one:
 *   1. Identify whether the state is redundant
 *   2. Decide: derive inline, remove entirely, or justify keeping it
 *   3. Refactor — remove the effect and derive during render where possible
 *
 * Key reading: https://react.dev/learn/you-might-not-need-an-effect#updating-state-based-on-props-or-state
 *
 * For Exercise B, also read: https://react.dev/reference/react/useOptimistic
 */

import type { FunctionComponent } from "react";
import { useEffect, useState } from "react";

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
  const [badge, setBadge] = useState(statusIcon);

  useEffect(() => setBadge(statusIcon), [statusIcon]);

  if (isStationOffline) {
    if (badge !== "unknown") {
      setBadge("unknown"); // setState during render!
    }
    return <span>Station offline ({badge})</span>;
  }

  if (!forecast) {
    if (badge !== "unknown") {
      setBadge("unknown"); // setState during render!
    }
    return <span>No forecast data ({badge})</span>;
  }

  return <span>Current weather: {badge}</span>;
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
