import { useState } from "react";
import { FancyInputDemo, ScrollSafeInput } from "../../exercises/07-dom-refs/exercise.tsx";

export default function Wrapper() {
  const [val, setVal] = useState(42);
  return (
    <>
      <h2>A: Fancy Input</h2>
      <FancyInputDemo />
      <h2>B: Scroll-Safe Input</h2>
      <p>Try scrolling on the number input while it's focused:</p>
      <ScrollSafeInput value={val} onChange={setVal} />
    </>
  );
}
