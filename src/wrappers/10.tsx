import { ProductPageManual, ProductPageWithSuspense } from "../../exercises/10-suspense/exercise.tsx";

export default function Wrapper() {
  return (
    <>
      <h2>A: Manual Loading States</h2>
      <ProductPageManual />
      <hr style={{ margin: "24px 0" }} />
      <h2>B: Suspense + use()</h2>
      <ProductPageWithSuspense />
    </>
  );
}
