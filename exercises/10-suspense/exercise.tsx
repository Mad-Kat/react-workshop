/**
 * Exercise 10: Suspense with use()
 * ==================================
 *
 * Mental model: Suspense says "this subtree is waiting for something —
 * show a fallback until it's ready."
 *
 * If you get stuck, open guide.md for step-by-step thinking.
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
// Goal: replace 6 state variables with 0. Let React manage loading states.
//
// Step 1: Create promises outside the component (at module scope)
// Step 2: Build ProductInfo and ReviewsList — each calls use(promise)
//         (You'll need to add Suspense and use to your imports from 'react')
// Step 3: Compose them in ProductPageWithSuspense:
//         - Each section gets its own Suspense boundary (independent loading)
//         - Wrap Suspense in SimpleErrorBoundary (error catches on outside)
//         - Product is critical → show error. Reviews are non-critical → degrade.
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

// TODO: Build a ProductInfo component that reads from productPromise using use()
// It should render the product name, price, and description.

// TODO: Build a ReviewsList component that reads from reviewsPromise using use()
// It should render each review with author, rating stars, and text.
// (You can copy the review rendering from ProductPageManual above)

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
