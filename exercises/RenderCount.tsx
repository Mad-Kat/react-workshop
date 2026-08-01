/**
 * Tiny inline badge that shows how many times a component has rendered.
 * Drop this next to any component output and pass in useRenderCount().
 */
export function RenderCount({ count }: { count: number }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontFamily: "monospace",
        color: "#e74c3c",
        background: "#ffeaea",
        padding: "1px 6px",
        borderRadius: 4,
        marginLeft: 8,
      }}
    >
      renders: {count}
    </span>
  );
}
