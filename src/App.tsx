import type { ComponentType, ReactNode } from "react";
import { Component, lazy, Suspense, useState, useEffect } from "react";

// ---------------------------------------------------------------------------
// Dynamic wrapper loading via URL parameter: ?ex=01 or ?ex=01-solution
// Falls back to exercise 01 if no parameter is specified.
// ---------------------------------------------------------------------------

const wrappers = import.meta.glob("./wrappers/*.tsx") as Record<
  string,
  () => Promise<{ default: ComponentType }>
>;

const wrapperIds = Object.keys(wrappers)
  .map((k) => k.replace("./wrappers/", "").replace(".tsx", ""))
  .sort();

// The newest released exercise — this branch only contains what has been
// released, so the latest one is what the current session is about.
const latestExerciseId = wrapperIds.filter((id) => !id.endsWith("-solution")).pop() ?? "01";

function getExerciseId(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("ex") || latestExerciseId;
}

function loadWrapper(id: string): ComponentType {
  const path = `./wrappers/${id}.tsx`;
  const loader = wrappers[path];
  if (!loader) {
    return () => (
      <div style={{ color: "red" }}>
        <h2>Wrapper not found: {id}</h2>
        <p>Available: {wrapperIds.join(", ")}</p>
        <p style={{ color: "#666" }}>
          Exercises are released one at a time — this one isn't out yet.
        </p>
      </div>
    );
  }
  return lazy(loader);
}

// ---------------------------------------------------------------------------
// Error Boundary
// ---------------------------------------------------------------------------

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, color: "red" }}>
          <h2>Something went wrong</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>{this.state.error.message}</pre>
          <button onClick={() => this.setState({ error: null })}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export const App = () => {
  const [exId, setExId] = useState(getExerciseId);

  useEffect(() => {
    const onPopState = () => setExId(getExerciseId());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // The preview runs inside an iframe on StackBlitz, so editing ?ex= by hand
  // is awkward. This picker is the reliable way to switch.
  const select = (id: string) => {
    window.history.pushState(null, "", `?ex=${id}`);
    setExId(id);
  };

  const Wrapper = loadWrapper(exId);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "16px 24px" }}>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
          fontSize: 13,
          color: "#666",
        }}
      >
        Exercise
        <select
          value={exId}
          onChange={(e) => select(e.target.value)}
          style={{ fontSize: 13, padding: "4px 6px" }}
        >
          {wrapperIds.map((id) => (
            <option key={id} value={id}>
              {id.endsWith("-solution") ? `${id.replace("-solution", "")} — solution` : id}
            </option>
          ))}
        </select>
      </label>
      <ErrorBoundary>
        <Suspense fallback={<p>Loading exercise {exId}...</p>}>
          <Wrapper />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};
