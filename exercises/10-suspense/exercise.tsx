/**
 * Exercise 11: Suspense with use()
 * ==================================
 *
 * Mental model: Suspense says "this subtree is waiting for something —
 * show a fallback until it's ready."
 *
 * React 19 introduces the `use(promise)` hook, which lets a component
 * suspend by reading from a Promise directly — no custom resource wrapper
 * needed. The old pattern (throwing promises manually via `createResource`)
 * is now replaced by a first-class hook.
 *
 * These are patterns found in our codebase.
 *
 * Exercise: Convert a component from manual loading states to Suspense + use().
 *
 * Key reading:
 *   - https://react.dev/reference/react/use
 *   - https://react.dev/reference/react/Suspense
 */

import type { FunctionComponent, ReactNode } from "react";
import { Component, useState } from "react";

// ---------------------------------------------------------------------------
// Simulated async data sources (read but don't modify these)
// ---------------------------------------------------------------------------

interface ProductData {
  id: string;
  name: string;
  price: number;
  description: string;
}

interface ReviewData {
  id: string;
  author: string;
  rating: number;
  text: string;
}

// Simulates an API call with delay
const fetchProduct = async (): Promise<ProductData> => {
  await new Promise((resolve) => setTimeout(resolve, 800));
  return {
    id: "1",
    name: "Wireless Headphones",
    price: 149.9,
    description: "Premium noise-cancelling wireless headphones.",
  };
};

const fetchReviews = async (): Promise<ReviewData[]> => {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  // Uncomment to test the error boundary:
  // throw new Error("Failed to load reviews");
  return [
    { id: "r1", author: "Alice", rating: 5, text: "Amazing sound quality!" },
    { id: "r2", author: "Bob", rating: 4, text: "Great battery life." },
    { id: "r3", author: "Charlie", rating: 3, text: "Decent for the price." },
  ];
};

// ---------------------------------------------------------------------------
// Exercise Part 1: Manual Loading States (the "before" version)
//
// This component manages its own loading/error/data states manually.
// It works, but the logic is tangled with the UI, and both sections
// share a single loading phase — product can't appear before reviews.
//
// Count the state variables: 6 just for loading/error tracking.
//
// You do NOT need to change this component. It is the "before" version.
// ---------------------------------------------------------------------------

export const ProductPageManual: FunctionComponent = () => {
  const [product, setProduct] = useState<ProductData | null>(null);
  const [reviews, setReviews] = useState<ReviewData[] | null>(null);
  const [productLoading, setProductLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [productError, setProductError] = useState<string | null>(null);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  // Two separate data fetches, each with their own loading/error states.
  // This is exactly the complexity Suspense eliminates.
  //
  // ⚠️ DO NOT COPY THIS PATTERN — useState initializer for side effects is
  // an anti-pattern. We use it here only because it's shorter than useEffect
  // for a demo that intentionally shows "the wrong way." In real code, use
  // useEffect or (better) Suspense with use().
  useState(() => {
    fetchProduct()
      .then((data) => {
        setProduct(data);
        setProductLoading(false);
      })
      .catch((err) => {
        setProductError(err.message);
        setProductLoading(false);
      });

    fetchReviews()
      .then((data) => {
        setReviews(data);
        setReviewsLoading(false);
      })
      .catch((err) => {
        setReviewsError(err.message);
        setReviewsLoading(false);
      });
  });

  return (
    <div>
      <h1>Product Page</h1>

      {/* Product section */}
      {productLoading ? (
        <div>Loading product...</div>
      ) : productError ? (
        <div style={{ color: "red" }}>Error: {productError}</div>
      ) : product ? (
        <div>
          <h2>{product.name}</h2>
          <p>CHF {product.price.toFixed(2)}</p>
          <p>{product.description}</p>
        </div>
      ) : null}

      {/* Reviews section */}
      {reviewsLoading ? (
        <div>Loading reviews...</div>
      ) : reviewsError ? (
        <div style={{ color: "red" }}>Reviews error: {reviewsError}</div>
      ) : reviews ? (
        <div>
          <h3>Reviews</h3>
          {reviews.map((review) => (
            <div key={review.id} style={{ marginBottom: 8 }}>
              <strong>{review.author}</strong> {"★".repeat(review.rating)}
              <p>{review.text}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Exercise Part 2: Build the Suspense + use() version
//
// Part 1 shows 6 state variables just to track loading/error for two fetches.
// Suspense inverts this: instead of the COMPONENT managing loading state,
// React manages it. The component just reads data — if it's not ready yet,
// React shows the nearest <Suspense> fallback automatically.
//
// React 19's `use(promise)` hook suspends the component until the promise
// resolves — just like the old `createResource` approach, but without any
// wrapper. The Suspense boundary catches the suspension and shows a fallback.
// The ErrorBoundary catches rejected promises and shows an error fallback.
//
// How `use()` relates to Relay:
//   Relay internally uses the same Suspense mechanism. When you call
//   `useFragment` or `useLazyLoadQuery`, Relay checks if the data is in the
//   store. If not, it throws a Promise — Suspense catches it and shows the
//   fallback. `use()` is the same pattern made available to application code.
//
// TODO:
//   1. Create promises OUTSIDE the component (they start fetching immediately)
//      const productPromise = fetchProduct();
//      const reviewsPromise = fetchReviews();
//
//   2. Build ProductInfo and ReviewsList components that call use(promise)
//      to suspend until data is ready
//
//   3. Wrap ProductInfo in:
//        <SimpleErrorBoundary fallback={<p>Failed to load product.</p>}>
//          <Suspense fallback={<div>Loading product...</div>}>
//            <ProductInfo />
//          </Suspense>
//        </SimpleErrorBoundary>
//
//   4. Wrap ReviewsList in a SEPARATE Suspense + SimpleErrorBoundary with
//      fallback "Reviews unavailable" (non-critical — degrade gracefully)
//
//   5. Observe: product appears at 800ms, reviews at 1500ms — independently.
//      The manual version above couldn't do this without extra complexity.
//
// Hint: `use()` can only be called inside a component (like other hooks).
//       The promise must be created OUTSIDE the component so it doesn't
//       restart on every render.
// ---------------------------------------------------------------------------

// TODO: Create promises outside the component
// const productPromise = fetchProduct();
// const reviewsPromise = fetchReviews();

// Provided: a minimal ErrorBoundary class component
// (Class components are required for error boundaries — hooks can't catch errors)
class SimpleErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// TODO: Build ProductInfo component
// function ProductInfo() {
//   const product = use(productPromise);
//   return (
//     <div>
//       <h2>{product.name}</h2>
//       <p>CHF {product.price.toFixed(2)}</p>
//       <p>{product.description}</p>
//     </div>
//   );
// }

// TODO: Build ReviewsList component
// function ReviewsList() {
//   const reviews = use(reviewsPromise);
//   return (
//     <div>
//       <h3>Reviews</h3>
//       {reviews.map((review) => (...))}
//     </div>
//   );
// }

// TODO: Build ProductPageWithSuspense using Suspense + SimpleErrorBoundary
export const ProductPageWithSuspense: FunctionComponent = () => {
  return (
    <div>
      <h1>Product Page (TODO: add Suspense + use())</h1>
      {/* Replace with Suspense-wrapped ProductInfo and ReviewsList */}
    </div>
  );
};

// Suppress unused import warning for the exercise scaffold
void SimpleErrorBoundary;
