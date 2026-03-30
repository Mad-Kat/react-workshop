/**
 * Exercise 12: Error Boundaries — Where They Catch, Where They Don't — SOLUTIONS
 * ================================================================================
 */

import type { FunctionComponent, ReactNode } from "react";
import { Component, useState } from "react";

// ---------------------------------------------------------------------------
// Error boundary with retry support
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
// Product detail sections
// ---------------------------------------------------------------------------

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
// Solution: Each section wrapped in its own ErrorBoundary
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

      {/* Critical section: full error display + retry button */}
      <ErrorBoundary
        name="ProductInfo"
        fallback={({ error, retry }) => (
          <div style={{ padding: 16, border: "2px solid red", marginBottom: 16, color: "red" }}>
            <h2>Failed to load product</h2>
            <p>{error.message}</p>
            <button onClick={retry}>Retry</button>
          </div>
        )}
      >
        <ProductInfo shouldFail={productFails} />
      </ErrorBoundary>

      {/* Non-critical section: "unavailable" message + retry */}
      <ErrorBoundary
        name="Reviews"
        fallback={({ retry }) => (
          <div style={{ padding: 16, border: "1px solid #ddd", marginBottom: 16, color: "#999" }}>
            <h3>Reviews unavailable</h3>
            <button onClick={retry} style={{ color: "#999" }}>Try again</button>
          </div>
        )}
      >
        <ReviewsSection shouldFail={reviewsFails} />
      </ErrorBoundary>

      {/* Non-critical section: silently hidden on error */}
      <ErrorBoundary
        name="Recommendations"
        fallback={null}
      >
        <RecommendationsSection shouldFail={recommendationsFails} />
      </ErrorBoundary>
    </div>
  );
};

/**
 * Key patterns demonstrated:
 *
 * 1. Granular error isolation
 *    Each section has its own boundary. Reviews crashing doesn't affect
 *    product info. This is exactly how our product detail page works —
 *    each block (description, specs, reviews, Q&A) has its own boundary.
 *
 * 2. Fallback severity levels
 *    - Critical (product): full error + retry
 *    - Non-critical (reviews): "unavailable" + retry
 *    - Optional (recommendations): null fallback (silently hidden)
 *
 * 3. Retry via state reset
 *    Our ErrorBoundary resets by setting error to null, which re-renders
 *    children. If the underlying problem is fixed (e.g., network restored),
 *    the component will render successfully.
 *
 * 4. What boundaries DON'T catch
 *    - Event handlers: use try/catch + setState
 *    - Async code: handle in .catch() or try/catch with await
 *    - SSR: server errors crash the whole render
 *    - The boundary itself: use a parent boundary
 *
 * Real codebase references:
 *   - segments/error-boundary/src/errorBoundary.tsx: symbol-based handler matching
 *   - segments/error-boundary/src/useErrorHandler.ts: targeted error handlers
 */
