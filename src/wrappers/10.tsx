import { TodoListManual, TodoListWithActions, LikeButton } from "../../exercises/10-actions/exercise.tsx";

export default function Wrapper() {
  return (
    <>
      <h2>A: Manual State (before)</h2>
      <TodoListManual />
      <h2>B: Action Props (your exercise)</h2>
      <TodoListWithActions />
      <h2>C: useActionState</h2>
      <LikeButton />
    </>
  );
}
