import { useState } from "react";
import { FancyInputDemo, ScrollSafeInput } from "../../exercises/07-dom-refs/solution.tsx";

export default function Wrapper() {
  const [val, setVal] = useState(42);
  return (
    <>
      <h2>A: Fancy Input</h2>
      <FancyInputDemo />
      <h2>B: Scroll-Safe Input</h2>
      <p>
        Expand the advanced settings, focus the number input, then scroll over
        it. The value must NOT change. Current value: <strong>{val}</strong>
      </p>
      <ScrollSafeInput value={val} onChange={setVal} />
    </>
  );
}
