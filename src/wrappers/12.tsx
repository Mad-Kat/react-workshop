import { SSRSimulator } from "../ssr-sim/SSRSimulator";

export default function Wrapper() {
  return (
    <SSRSimulator
      moduleKey="12-ssr-hydration/exercise"
      exportName="SSRExercises"
      title="Exercise 12 — SSR & Hydration"
    />
  );
}
