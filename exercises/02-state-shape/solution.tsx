/**
 * Exercise 02: State Shape & Derived State — SOLUTIONS
 * =====================================================
 */

import type { FunctionComponent } from "react";
import { useOptimistic, useTransition } from "react";
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
