import { ClosuresExercise, ReferenceEqualityExercise } from "../../exercises/01-closures-and-references/exercise.tsx";

export default function Wrapper() {
  return (
    <>
      <ClosuresExercise />
      <hr style={{ margin: "24px 0" }} />
      <ReferenceEqualityExercise />
    </>
  );
}
