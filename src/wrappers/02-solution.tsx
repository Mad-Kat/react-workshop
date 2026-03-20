import { ThemeEditor, StaleClosureDemo } from "../../exercises/02-snapshot-key/solution.tsx";

export default function Wrapper() {
  return (
    <>
      <h2>A & B: Theme Editor with Font Picker</h2>
      <ThemeEditor />
      <h2>C: Stale Closure Demo</h2>
      <StaleClosureDemo />
    </>
  );
}
