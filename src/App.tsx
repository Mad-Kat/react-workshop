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

function getExerciseId(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("ex") || "01";
}

function loadWrapper(id: string): ComponentType {
  const path = `./wrappers/${id}.tsx`;
  const loader = wrappers[path];
  if (!loader) {
    return () => (
      <div style={{ color: "red" }}>
        <h2>Wrapper not found: {id}</h2>
        <p>Available: {Object.keys(wrappers).map(k => k.replace("./wrappers/", "").replace(".tsx", "")).join(", ")}</p>
      </div>
    );
  }
  return lazy(loader);
}

// ---------------------------------------------------------------------------
// Error Boundary
// ---------------------------------------------------------------------------

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, color: "red" }}>
          <h2>Something went wrong</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {this.state.error.message}
          </pre>
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

  const Wrapper = loadWrapper(exId);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "16px 24px" }}>
      <ErrorBoundary>
        <Suspense fallback={<p>Loading exercise {exId}...</p>}>
          <Wrapper />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};
