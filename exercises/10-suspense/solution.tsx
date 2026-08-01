/**
 * Exercise 10: Suspense with use() — SOLUTIONS
 * ==============================================
 *
 * Key reading:
 *   - https://react.dev/reference/react/use
 *   - https://react.dev/reference/react/Suspense
 */

import type { FunctionComponent, ReactNode } from "react";
import { Component, Suspense, use } from "react";

// ---------------------------------------------------------------------------
// Simulated async data sources
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
// ErrorBoundary
//
// Class components are required for error boundaries — React has no hook
// equivalent because getDerivedStateFromError must run synchronously during
// rendering, and hooks run at different points in the lifecycle.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Solution: Promises created outside components
//
// This is the key insight: the promise must be created OUTSIDE the component.
// If you wrote `const productPromise = fetchProduct()` inside ProductInfo,
// it would create a NEW promise on every render — including the re-render
// that React triggers after the Suspense fallback is shown. This would loop
// forever: render → new promise → suspend → render → new promise → ...
//
// By creating the promise at module scope (or in a parent before the
// Suspense boundary), the fetch starts immediately and the same promise
// instance is reused across all renders.
//
// This is exactly what Relay does: the network request is kicked off when
// the query is rendered (or preloaded), and the same request is referenced
// from the cache on subsequent renders.
// ---------------------------------------------------------------------------
const productPromise = fetchProduct();
const reviewsPromise = fetchReviews();

// ---------------------------------------------------------------------------
// Solution: Components that call use(promise) to suspend
//
// `use(promise)` works like this:
//   - If the promise is pending → throws the promise → Suspense shows fallback
//   - If the promise is rejected → throws the error → ErrorBoundary catches it
//   - If the promise is resolved → returns the value → component renders
//
// This is IDENTICAL to the old `createResource().read()` pattern from Day 13.
// The difference: `use()` is a first-class React hook. No wrapper needed.
// No custom `status` tracking. No `throw promise` written by hand.
//
// Under the hood, Relay does the same thing — it stores query data in a
// cache, and when a component reads data that isn't ready yet, it throws a
// Promise. `use()` makes this mechanism available to plain Promise instances.
// ---------------------------------------------------------------------------

const ProductInfo: FunctionComponent = () => {
  // `use()` suspends this component until productPromise resolves.
  // The Suspense boundary above us shows "Loading product..." until then.
  const product = use(productPromise);

  return (
    <div>
      <h2>{product.name}</h2>
      <p>CHF {product.price.toFixed(2)}</p>
      <p>{product.description}</p>
    </div>
  );
};

const ReviewsList: FunctionComponent = () => {
  // Separate promise — this component suspends independently of ProductInfo.
  // Product renders at 800ms; reviews render at 1500ms.
  const reviews = use(reviewsPromise);

  return (
    <div>
      <h3>Reviews</h3>
      {reviews.map((review) => (
        <div key={review.id} style={{ marginBottom: 8 }}>
          <strong>{review.author}</strong> {"★".repeat(review.rating)}
          <p>{review.text}</p>
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Solution: Composed page with independent Suspense boundaries
//
// Each section has its own Suspense + ErrorBoundary pair.
// This matches the LazyLoadQueryBoundary structure in our codebase:
//
//   <ClientSideRender>       ← SSR safety (Exercise 12)
//     <ErrorBoundary>        ← catches render errors + rejected promises
//       <Suspense>           ← catches pending promises (use() suspension)
//         {children}
//       </Suspense>
//     </ErrorBoundary>
//   </ClientSideRender>
//
// ErrorBoundary wraps Suspense (outside), not the other way around.
// If the promise rejects, `use()` re-throws the error, and the ErrorBoundary
// above the Suspense boundary catches it. A boundary inside Suspense would
// catch it too, but the outer position is correct and matches our codebase.
// ---------------------------------------------------------------------------

export const ProductPageWithSuspense: FunctionComponent = () => {
  return (
    <div>
      <h1>Product Page</h1>

      {/* Product section: critical — show full error */}
      <SimpleErrorBoundary fallback={<div style={{ color: "red" }}>Failed to load product.</div>}>
        <Suspense fallback={<div>Loading product...</div>}>
          <ProductInfo />
        </Suspense>
      </SimpleErrorBoundary>

      {/*
       * Reviews section: non-critical — degrade gracefully
       *
       * Separate Suspense boundary means product appears at 800ms without
       * waiting for reviews (1500ms). The user sees content progressively.
       *
       * Fallback severity:
       *   - Product (critical):     full error message
       *   - Reviews (non-critical): "Reviews unavailable" — don't block the page
       *
       * This is the same strategy used for product detail blocks in our codebase:
       * each block (description, specs, reviews, Q&A) has its own boundary so
       * one failing block doesn't hide the others.
       */}
      <SimpleErrorBoundary
        fallback={<div style={{ color: "#999", fontStyle: "italic" }}>Reviews unavailable</div>}
      >
        <Suspense fallback={<div>Loading reviews...</div>}>
          <ReviewsList />
        </Suspense>
      </SimpleErrorBoundary>
    </div>
  );
};

/**
 * Key patterns:
 *   1. use(promise) — first-class hook replacing the old throw-promise pattern
 *   2. Promises created OUTSIDE components — avoids infinite suspend loop
 *   3. Separate Suspense boundaries — product at 800ms, reviews at 1500ms
 *   4. ErrorBoundary wraps Suspense (outside) — matches LazyLoadQueryBoundary
 *   5. Relay connection — useFragment/useLazyLoadQuery use the same mechanism internally
 *
 * >> INSTRUCTOR: use() can also read Context conditionally — unlike useContext,
 * >> it works inside if-statements and loops. This is a React 19 addition that
 * >> makes use() more flexible than useContext for conditional context reads.
 *
 * Manual vs Suspense: 6 state variables → 0 state variables.
 *
 * Real codebase reference:
 *   - segments/relay/src/data/lazyLoadQueryBoundary.tsx: Suspense + ErrorBoundary + ClientSideRender
 */

// ---------------------------------------------------------------------------
// Key takeaway
//   use() and Suspense move loading and error branches out of the component
//   and into boundaries: six state variables become zero.
//   The ErrorBoundary goes outside the Suspense boundary, not inside it.
// ---------------------------------------------------------------------------
