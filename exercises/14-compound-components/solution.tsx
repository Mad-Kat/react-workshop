/**
 * Exercise 14: Compound Components — SOLUTION
 * =============================================
 */

import type { FunctionComponent, ReactNode } from "react";
import { createContext, use, useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// PROVIDED: Context definitions (same as exercise — don't modify)
//
// >> INSTRUCTOR: We use <Context value={...}> without .Provider — this is the
// >> React 19 way. The old .Provider suffix still works but is deprecated.
// ---------------------------------------------------------------------------

interface DisclosureContextValue {
  activeItem: string | null;
  setActiveItem: (id: string | null) => void;
}

const DisclosureContext = createContext<DisclosureContextValue | null>(null);

function useDisclosureContext(): DisclosureContextValue {
  const ctx = use(DisclosureContext);
  if (!ctx) {
    throw new Error("Disclosure components must be used inside <Disclosure>");
  }
  return ctx;
}

const DisclosureItemContext = createContext<string | null>(null);

function useDisclosureItemId(): string {
  const id = use(DisclosureItemContext);
  if (id === null) {
    throw new Error(
      "DisclosureTrigger/Content must be used inside <DisclosureItem>",
    );
  }
  return id;
}

// ---------------------------------------------------------------------------
// END PROVIDED
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Solution: Disclosure (owns state, provides context)
// ---------------------------------------------------------------------------

export const Disclosure: FunctionComponent<{ children: ReactNode }> = ({ children }) => {
  const [activeItem, setActiveItem] = useState<string | null>(null);

  // Stabilize the context object so that only the component whose item became
  // active/inactive re-renders. Without useMemo, every Disclosure re-render
  // produces a new object reference and all consumers re-render unnecessarily.
  // Same pattern as accordion.tsx in user-menu.
  const contextValue = useMemo(
    () => ({ activeItem, setActiveItem }),
    [activeItem],
  );

  return (
    <DisclosureContext value={contextValue}>
      <div>{children}</div>
    </DisclosureContext>
  );
};

// ---------------------------------------------------------------------------
// Solution: DisclosureItem (provides item ID via nested context)
// ---------------------------------------------------------------------------

export const DisclosureItem: FunctionComponent<{ id: string; children: ReactNode }> = ({
  id,
  children,
}) => {
  return (
    <DisclosureItemContext value={id}>
      <div style={{ borderBottom: "1px solid #ddd" }}>{children}</div>
    </DisclosureItemContext>
  );
};

// ---------------------------------------------------------------------------
// Solution: DisclosureTrigger (reads both contexts, toggles on click)
// ---------------------------------------------------------------------------

export const DisclosureTrigger: FunctionComponent<{ children: ReactNode }> = ({ children }) => {
  const { activeItem, setActiveItem } = useDisclosureContext();
  const itemId = useDisclosureItemId();

  const isActive = activeItem === itemId;

  const handleClick = () => {
    // Toggle: close if already active, open otherwise
    setActiveItem(isActive ? null : itemId);
  };

  return (
    <button
      onClick={handleClick}
      style={{
        width: "100%",
        padding: "12px 16px",
        textAlign: "left",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        fontSize: 16,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      {children}
      <span>{isActive ? "▲" : "▼"}</span>
    </button>
  );
};

// ---------------------------------------------------------------------------
// Solution: DisclosureContent (renders only when this item is active)
// ---------------------------------------------------------------------------

export const DisclosureContent: FunctionComponent<{ children: ReactNode }> = ({ children }) => {
  const { activeItem } = useDisclosureContext();
  const itemId = useDisclosureItemId();

  if (activeItem !== itemId) {
    return null;
  }

  return <div style={{ padding: "0 16px 16px" }}>{children}</div>;
};

// ---------------------------------------------------------------------------
// Demo usage
// ---------------------------------------------------------------------------

export const DisclosureDemo: FunctionComponent = () => {
  return (
    <div style={{ maxWidth: 400, margin: "0 auto" }}>
      <h1>FAQ</h1>
      <Disclosure>
        <DisclosureItem id="shipping">
          <DisclosureTrigger>Shipping Info</DisclosureTrigger>
          <DisclosureContent>
            Free shipping on orders over CHF 50. Standard delivery: 1-3 business days.
          </DisclosureContent>
        </DisclosureItem>

        <DisclosureItem id="returns">
          <DisclosureTrigger>Return Policy</DisclosureTrigger>
          <DisclosureContent>
            30-day return policy on all items. Items must be in original packaging.
          </DisclosureContent>
        </DisclosureItem>

        <DisclosureItem id="warranty">
          <DisclosureTrigger>Warranty</DisclosureTrigger>
          <DisclosureContent>
            2-year warranty on all electronics. Contact support for claims.
          </DisclosureContent>
        </DisclosureItem>
      </Disclosure>
    </div>
  );
};

/**
 * Key patterns demonstrated:
 *
 * 1. Two-level context
 *    DisclosureContext: one instance per accordion, holds the active item.
 *    DisclosureItemContext: one instance per row, holds the row's ID.
 *    DisclosureTrigger and DisclosureContent read BOTH to answer "am I active?".
 *    This avoids prop-drilling through arbitrarily deep children.
 *
 * 2. "Must be inside parent" guard
 *    useDisclosureContext() and useDisclosureItemId() throw with a helpful
 *    message when used outside their required ancestors.
 *    Same pattern as carouselContext.tsx:
 *      if (!context) throw new Error("cannot be rendered outside <Carousel />");
 *    Fail loudly during development rather than silently rendering wrong content.
 *
 * 3. Stabilized context value with useMemo
 *    Without useMemo, each state update in Disclosure creates a new context
 *    object, causing ALL Trigger and Content components to re-render — even
 *    those whose item didn't change. useMemo ensures only identity changes
 *    when activeItem actually changes.
 *    Same pattern as accordion.tsx in user-menu.
 *
 * 4. Bonus: dual context for further performance
 *    For large compound components (product detail with 10+ sections), split
 *    state from dispatch so components that only call setActiveItem don't
 *    re-render when activeItem changes.
 *    Example in codebase: domains/product-detail blockStatesContext.tsx
 *      <BlockStatesContext value={state}>
 *        <BlockUpdaterContext value={dispatch}>
 *
 * Real codebase references:
 *   - libraries/user-menu/.../accordion.tsx: minimal compound component
 *   - segments/carousel/src/carouselContext.tsx: "must be inside parent" guard
 */
