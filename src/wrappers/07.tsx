import { useState } from "react";
import {
  FancyInputDemo,
  HintButton,
  ScrollSafeInput,
} from "../../exercises/07-dom-refs/exercise.tsx";

const hintStyle = { fontSize: 12, color: "#999" };

export default function Wrapper() {
  const [quantity, setQuantity] = useState(2);

  return (
    <>
      <h2>A: Fancy Input</h2>
      <FancyInputDemo />
      <h2>B: Hint Bubble</h2>
      <p style={hintStyle}>
        Hover the buttons. Then scroll down until they're at the top of the window and hover again.
      </p>
      <HintButton label="Delivery" hint="Ships tomorrow." />{" "}
      <HintButton
        label="Returns"
        hint="Free returns within 30 days. Bring it to any store, or send it back with the label in the box. Refunds take three to five working days."
      />
      <h2>C: Scroll-Safe Input</h2>
      <p style={hintStyle}>
        Click Edit, keep the mouse over the number and scroll. Use Chrome for this one: other
        browsers may not change a number input on scroll at all.
      </p>
      <ScrollSafeInput value={quantity} onChange={setQuantity} />
      {/* Room to scroll part B to the top of the window */}
      <div style={{ height: "100vh" }} />
    </>
  );
}
