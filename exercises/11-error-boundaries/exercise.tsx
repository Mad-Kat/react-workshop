/**
 * Exercise 11: Error Boundaries — Where They Catch, Where They Don't
 * ===================================================================
 *
 * Mental model: Error boundaries catch rendering errors. They do NOT catch
 * event handlers, async code, or SSR errors.
 *
 * If you get stuck, open guide.md for step-by-step thinking.
 *
 * These are patterns found in our codebase.
 */

import type { FunctionComponent, ReactNode } from "react";
import { Component, useState } from "react";

// ---------------------------------------------------------------------------
// Error boundary with retry support (read but don't modify)
// ---------------------------------------------------------------------------

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode | ((props: { error: Error; retry: () => void }) => ReactNode);
  name?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      const { fallback } = this.props;
      if (typeof fallback === "function") {
        return fallback({ error: this.state.error, retry: this.handleRetry });
      }
      return fallback;
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Simulated product detail sections (each may fail)
// ---------------------------------------------------------------------------

// Critical section — must show error + retry
const ProductInfo: FunctionComponent<{ shouldFail?: boolean }> = ({ shouldFail }) => {
  if (shouldFail) {
    throw new Error("Failed to load product data");
  }
  return (
    <div style={{ padding: 16, border: "1px solid #ccc", marginBottom: 16 }}>
      <h2>Wireless Headphones</h2>
      <p>CHF 149.90</p>
      <p>Premium noise-cancelling wireless headphones with 30h battery life.</p>
    </div>
  );
};

// Non-critical section — should show "unavailable" on error
const ReviewsSection: FunctionComponent<{ shouldFail?: boolean }> = ({ shouldFail }) => {
  if (shouldFail) {
    throw new Error("Reviews service unavailable");
  }
  return (
    <div style={{ padding: 16, border: "1px solid #ccc", marginBottom: 16 }}>
      <h3>Customer Reviews</h3>
      <div>★★★★★ — "Amazing sound quality!" — Alice</div>
      <div>★★★★☆ — "Great battery life." — Bob</div>
    </div>
  );
};

// Non-critical section — should silently hide on error
const RecommendationsSection: FunctionComponent<{ shouldFail?: boolean }> = ({ shouldFail }) => {
  if (shouldFail) {
    throw new Error("Recommendation engine timeout");
  }
  return (
    <div style={{ padding: 16, border: "1px solid #ccc", marginBottom: 16 }}>
      <h3>You Might Also Like</h3>
      <div>• Bluetooth Speaker — CHF 89.90</div>
      <div>• Headphone Stand — CHF 29.90</div>
      <div>• USB-C Audio Adapter — CHF 19.90</div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Exercise: Product Detail Page
//
// Currently, if ANY section throws, the whole page crashes.
//
// Exercise A: Isolate failures
//   Each section has different criticality. The product info is essential,
//   reviews are nice-to-have, recommendations are optional.
//   Wrap each section in its own ErrorBoundary with an appropriate fallback.
//   (Read the ErrorBoundary class above — especially the fallback prop type.)
//   Test with the failure toggles to verify isolation works.
//
// Exercise B: Discover what boundaries DON'T catch
//   Uncomment BrokenButton below. Wrap it in an ErrorBoundary.
//   Click it. Does the boundary catch the error? Why not?
// ---------------------------------------------------------------------------

export const ProductDetailPage: FunctionComponent = () => {
  const [productFails, setProductFails] = useState(false);
  const [reviewsFails, setReviewsFails] = useState(false);
  const [recommendationsFails, setRecommendationsFails] = useState(false);

  return (
    <div>
      <h1>Product Detail</h1>

      {/* Failure toggles for testing */}
      <div style={{ marginBottom: 16, padding: 8, background: "#f5f5f5" }}>
        <label>
          <input type="checkbox" checked={productFails} onChange={() => setProductFails(!productFails)} />
          {" "}Product fails
        </label>
        <label style={{ marginLeft: 16 }}>
          <input type="checkbox" checked={reviewsFails} onChange={() => setReviewsFails(!reviewsFails)} />
          {" "}Reviews fail
        </label>
        <label style={{ marginLeft: 16 }}>
          <input type="checkbox" checked={recommendationsFails} onChange={() => setRecommendationsFails(!recommendationsFails)} />
          {" "}Recommendations fail
        </label>
      </div>

      {/* TODO: Wrap each section in its own ErrorBoundary with appropriate fallback */}

      <ProductInfo shouldFail={productFails} />

      <ReviewsSection shouldFail={reviewsFails} />

      <RecommendationsSection shouldFail={recommendationsFails} />
    </div>
  );
};

// Suppress unused import — available for you to use in your solution
void ErrorBoundary;

// ---------------------------------------------------------------------------
// Exercise B: What Boundaries DON'T Catch
//
// Uncomment this component. Wrap it in an ErrorBoundary.
// Click the button. Does the boundary catch the error?
//
// Error boundaries catch errors during RENDERING (the return statement).
// They do NOT catch:
//   - Event handlers (use try/catch in the handler)
//   - Async code (Promises, setTimeout)
//   - SSR errors
//   - Errors in the boundary itself
// ---------------------------------------------------------------------------

// const BrokenButton: FunctionComponent = () => (
//   <button onClick={() => { throw new Error("Event handler error"); }}>
//     Click me (will the boundary catch this?)
//   </button>
// );
