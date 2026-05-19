import { useState } from "react";
import { WeatherStatusBadge, TemperatureReading } from "../../exercises/02-state-shape/exercise.tsx";

type WeatherStatusIcon = "sunny" | "cloudy" | "rainy" | "unknown";
const icons: WeatherStatusIcon[] = ["sunny", "cloudy", "rainy"];

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

      <h2>B: Temperature Reading</h2>
      <TemperatureReading initialCelsius={20} />
    </>
  );
}
