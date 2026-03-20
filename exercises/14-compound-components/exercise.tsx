/**
 * Exercise 14: Compound Components
 * ==================================
 *
 * Mental model: Context used internally by a component family. Consumer API
 * is clean; wiring is hidden inside the components.
 *
 * These are patterns found in our codebase.
 *
 * Exercise: Wire up a Disclosure compound component using the provided contexts.
 */

import type { FunctionComponent, ReactNode } from "react";
import { createContext, use, useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// PROVIDED: Context definitions (don't modify)
//
// >> INSTRUCTOR: Note that we use <DisclosureContext value={...}> directly —
// >> NOT <DisclosureContext.Provider>. React 19 supports rendering Context
// >> itself as a provider. The .Provider suffix is deprecated. Our codebase
// >> still uses .Provider in many places; new code should drop it.
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

// The goal is a compound component with this consumer API:
//
// <Disclosure>
//   <DisclosureItem id="shipping">
//     <DisclosureTrigger>Shipping Info</DisclosureTrigger>
//     <DisclosureContent>
//       Free shipping on orders over CHF 50.
//     </DisclosureContent>
//   </DisclosureItem>
//   <DisclosureItem id="returns">
//     <DisclosureTrigger>Return Policy</DisclosureTrigger>
//     <DisclosureContent>
//       30-day return policy on all items.
//     </DisclosureContent>
//   </DisclosureItem>
// </Disclosure>
//
// The contexts are already defined above — your job is to WIRE them.

// ---------------------------------------------------------------------------
// TODO: Implement Disclosure
//
//   - Own the activeItem state (string | null, starts as null)
//   - Provide DisclosureContext to children
//   - Tip: stabilize the context value with useMemo to avoid unnecessary
//     re-renders of every trigger and content when activeItem changes
// ---------------------------------------------------------------------------

export const Disclosure: FunctionComponent<{ children: ReactNode }> = ({ children }) => {
  // TODO: useState for activeItem
  // TODO: useMemo for context value
  // TODO: wrap children in <DisclosureContext value={...}>
  return <div>{children}</div>;
};

// ---------------------------------------------------------------------------
// TODO: Implement DisclosureItem
//
//   - Accept an `id` prop
//   - Provide that id to children via DisclosureItemContext
// ---------------------------------------------------------------------------

export const DisclosureItem: FunctionComponent<{ id: string; children: ReactNode }> = ({
  children,
}) => {
  // TODO: wrap children in <DisclosureItemContext value={id}>
  return <div style={{ borderBottom: "1px solid #ddd" }}>{children}</div>;
};

// ---------------------------------------------------------------------------
// TODO: Implement DisclosureTrigger
//
//   - Read activeItem and setActiveItem from useDisclosureContext()
//   - Read the current item's id from useDisclosureItemId()
//   - On click: if this item is active, close it (set null); otherwise open it
//   - Show ▼ when closed, ▲ when open
// ---------------------------------------------------------------------------

export const DisclosureTrigger: FunctionComponent<{ children: ReactNode }> = ({ children }) => {
  // TODO: const { activeItem, setActiveItem } = useDisclosureContext();
  // TODO: const itemId = useDisclosureItemId();
  // TODO: const isActive = activeItem === itemId;
  return (
    <button
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
      {/* TODO: render ▲ or ▼ based on isActive */}
      <span>▼</span>
    </button>
  );
};

// ---------------------------------------------------------------------------
// TODO: Implement DisclosureContent
//
//   - Read activeItem from useDisclosureContext()
//   - Read the current item's id from useDisclosureItemId()
//   - Return null when this item is NOT the active one
// ---------------------------------------------------------------------------

export const DisclosureContent: FunctionComponent<{ children: ReactNode }> = ({ children }) => {
  // TODO: const { activeItem } = useDisclosureContext();
  // TODO: const itemId = useDisclosureItemId();
  // TODO: if (activeItem !== itemId) return null;
  return <div style={{ padding: "0 16px 16px" }}>{children}</div>;
};

// ---------------------------------------------------------------------------
// Demo usage (this should work once the exercise is complete)
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
