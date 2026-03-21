import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";

// StrictMode removed intentionally — its double-invocation in dev mode
// makes the render counters in exercises misleading (shows 2x on mount).
// The workshop focuses on dependency/effect patterns, not purity checks.
createRoot(document.getElementById("root")!).render(<App />);
