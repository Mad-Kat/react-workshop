import { useRef } from "react";

/**
 * Returns how many times the calling component has rendered.
 * Use this to spot unnecessary re-renders — the number should
 * only go up when something meaningful changed.
 */
export function useRenderCount(): number {
  const count = useRef(0);
  count.current++;
  return count.current;
}
