import { useMemo, useState } from "react";
import { WeatherStatusBadge, useNotificationPreference } from "../../exercises/02-state-shape/exercise.tsx";

type WeatherStatusIcon = "sunny" | "cloudy" | "rainy" | "unknown";
const icons: WeatherStatusIcon[] = ["sunny", "cloudy", "rainy"];

function NotificationDemo() {
  // Simulate server state — this is what Relay would manage in production
  const [serverEnabled, setServerEnabled] = useState(false);
  const channel = useMemo(
    () => ({ id: "ch-1", preference: { emailNotificationsEnabled: serverEnabled } }),
    [serverEnabled],
  );

  const { isEnabled, togglePreference } = useNotificationPreference(channel, setServerEnabled);

  return (
    <div>
      <p>Email notifications: {isEnabled ? "ON" : "OFF"}</p>
      <p style={{ fontSize: 12, color: "#999" }}>Server state: {serverEnabled ? "ON" : "OFF"}</p>
      <button onClick={togglePreference}>Toggle</button>
    </div>
  );
}

export default function Wrapper() {
  const [icon, setIcon] = useState<WeatherStatusIcon>("sunny");
  const [offline, setOffline] = useState(false);

  return (
    <>
      <h2>A: Weather Status Badge</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        {icons.map((i) => (
          <button key={i} onClick={() => setIcon(i)} style={{ fontWeight: icon === i ? "bold" : "normal" }}>{i}</button>
        ))}
        <label><input type="checkbox" checked={offline} onChange={(e) => setOffline(e.target.checked)} /> offline</label>
      </div>
      <WeatherStatusBadge statusIcon={icon} isStationOffline={offline} forecast={offline ? null : { hasData: true }} />

      <h2>B: Notification Preference</h2>
      <NotificationDemo />
    </>
  );
}
