import {
  TodoListStep1UseTransition,
  TodoListStep2UseOptimistic,
  TodoListStep3FormAction,
  LikeButton,
} from "../../exercises/09-actions/solution.tsx";

export default function Wrapper() {
  return (
    <>
      <h2>Step 1: useTransition</h2>
      <TodoListStep1UseTransition />
      <hr style={{ margin: "24px 0" }} />
      <h2>Step 2: useOptimistic</h2>
      <TodoListStep2UseOptimistic />
      <hr style={{ margin: "24px 0" }} />
      <h2>Step 3: Form Action</h2>
      <TodoListStep3FormAction />
      <hr style={{ margin: "24px 0" }} />
      <h2>Step 4: useActionState (LikeButton)</h2>
      <LikeButton />
    </>
  );
}
