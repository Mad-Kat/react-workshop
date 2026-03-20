import type { ReactNode } from "react";
import { Component } from "react";

// ---------------------------------------------------------------------------
// Change this import each week to point at the current exercise/solution
// ---------------------------------------------------------------------------
import Wrapper from "./wrappers/01.tsx";

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
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "16px 24px" }}>
      <ErrorBoundary>
        <Wrapper />
      </ErrorBoundary>
    </div>
  );
};
