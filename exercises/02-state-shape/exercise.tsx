/**
 * Exercise 02: State Shape & Derived State
 * =========================================
 *
 * Mental model: If you can compute it during render, don't put it in state.
 *
 * Key reading: https://react.dev/learn/you-might-not-need-an-effect
 */

import type { FunctionComponent } from "react";
import { useEffect, useState } from "react";
import { useRenderCount } from "../useRenderCount";
import { RenderCount } from "../RenderCount";

// ---------------------------------------------------------------------------
// Exercise A: Weather Status Badge
//
// Something feels off about this component. Look at the useState + useEffect
// pair and the setBadge calls during render.
//
// Step 1: List every value that `badge` can be. Where does each come from?
// Step 2: Can you express all of those as a function of the props alone?
// Step 3: If yes — what can you delete?
// Step 4: Check the RenderCount before and after. Why did it change?
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
      setBadge("unknown");
    }
    return (
      <span>
        Station offline ({badge}) <RenderCount count={renderCount} />
      </span>
    );
  }

  if (!forecast) {
    if (badge !== "unknown") {
      setBadge("unknown");
    }
    return (
      <span>
        No forecast data ({badge}) <RenderCount count={renderCount} />
      </span>
    );
  }

  return (
    <span>
      Current weather: {badge} <RenderCount count={renderCount} />
    </span>
  );
};

// ---------------------------------------------------------------------------
// Exercise B: Temperature Reading
//
// Two ways to change this component: type a reading into the input, or
// toggle the unit. Typing touches the temperature alone. Toggling has to
// convert the reading that is already there, so it needs to read the
// temperature before overwriting it.
//
// Step 1: How many useState calls are there? Which ones change together,
//         and which one changes on its own?
// Step 2: The toggle has to know the current temperature to convert it.
//         What is that dependency doing to the shape of this code?
// Step 3: What primitive updates several values at once, computed from the
//         state you already have? (Hint: it's like a state machine)
// Step 4: After refactoring, which state variables disappear entirely?
// ---------------------------------------------------------------------------

const round1 = (n: number) => Math.round(n * 10) / 10;

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
        setTemperature((t) => round1(t * (9 / 5) + 32));
      } else {
        setTemperature((t) => round1((t - 32) * (5 / 9)));
      }
      setPrevUnit(unit);
    }
  }, [unit, prevUnit]);

  return (
    <div>
      <input
        type="number"
        value={temperature}
        onChange={(e) => setTemperature(Number(e.target.value) || 0)}
        style={{ width: 80 }}
      />
      <span>°{unit} </span>
      <button onClick={() => setUnit(unit === "C" ? "F" : "C")}>
        Switch to °{unit === "C" ? "F" : "C"}
      </button>
      <RenderCount count={renderCount} />
    </div>
  );
};
