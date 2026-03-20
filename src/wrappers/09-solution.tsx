import { ProductSearchWithIgnoreFlag, ProductSearchWithAbort } from "../../exercises/09-race-conditions/solution.tsx";

export default function Wrapper() {
  return (
    <>
      <h2>Solution 1: Ignore Flag</h2>
      <ProductSearchWithIgnoreFlag />
      <hr style={{ margin: "24px 0" }} />
      <h2>Solution 2: AbortController</h2>
      <ProductSearchWithAbort />
    </>
  );
}
