import { ProductSearch, ProductSearchAbort } from "../../exercises/08-race-conditions/exercise.tsx";

export default function Wrapper() {
  return (
    <>
      <ProductSearch />
      <hr style={{ margin: "24px 0" }} />
      <ProductSearchAbort />
    </>
  );
}
