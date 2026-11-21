import { useEffect, useId, useRef, useState } from "react";
import { layoutDiagram, LINE_H } from "./diagramLayout";

/**
 * A flow or relationship diagram drawn as SVG from the tutor's nodes and edges. Colours come from the theme tokens.
 * The picture has a text alternative, and the same connections are available as a list for anyone who cannot see it.
 */
export default function DiagramBlock({ alt, diagram }) {
  const uid = useId().replace(/:/g, "");
  const frame = useRef(null);
  // The room the diagram really has. A left-to-right diagram that would not fit reads top to bottom instead, so on a
  // phone (or at high zoom) it is rearranged rather than shrunk to unreadable text.
  const [room, setRoom] = useState(undefined);
  useEffect(() => {
    const el = frame.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => setRoom(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const layout = layoutDiagram(diagram, room ? { maxWidth: room } : undefined);
  const labelOf = new Map(diagram.nodes.map((node) => [node.id, node.label]));
  const connected = new Set(layout.edges.flatMap((edge) => [edge.from, edge.to]));

  return (
    <figure className="space-y-2">
      {/* Focusable so keyboard users can scroll a wide diagram; it keeps its natural size so text stays readable. */}
      <div ref={frame} tabIndex={0} role="region" aria-label="Diagram" className="overflow-x-auto rounded-xl border border-ink/10 bg-bg p-1 focus-visible:outline-2 focus-visible:outline-violet-500">
        <svg role="img" aria-labelledby={`${uid}-title`} viewBox={`0 0 ${layout.width} ${layout.height}`} width={layout.width} height={layout.height} className="mx-auto block max-w-none text-ink" style={{ fontSize: 13 }}>
          <title id={`${uid}-title`}>{alt}</title>
          <defs>
            <marker id={`${uid}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
              <path d="M0 0L10 5L0 10z" fill="currentColor" fillOpacity="0.7" />
            </marker>
          </defs>
          {layout.edges.map((edge) => (
            <g key={`${edge.from}>${edge.to}`}>
              <path d={edge.d} fill="none" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.5" markerEnd={`url(#${uid}-arrow)`} />
              {edge.text && (
                <>
                  <rect x={edge.labelX - edge.labelW / 2} y={edge.labelY - 10} width={edge.labelW} height="20" rx="4" style={{ fill: "rgb(var(--bg))" }} stroke="currentColor" strokeOpacity="0.15" />
                  <text x={edge.labelX} y={edge.labelY} textAnchor="middle" dominantBaseline="central" fontSize="12" fill="currentColor">{edge.text}</text>
                </>
              )}
            </g>
          ))}
          {layout.nodes.map((node) => {
            const first = node.y + (node.h - node.lines.length * LINE_H) / 2 + LINE_H / 2;
            return (
              <g key={node.id}>
                <rect x={node.x} y={node.y} width={node.w} height={node.h} rx="10" strokeWidth="1.5" style={{ fill: "rgb(var(--accent) / 0.12)", stroke: "rgb(var(--accent))" }} />
                <text textAnchor="middle" dominantBaseline="central" fill="currentColor">
                  {node.lines.map((line, i) => <tspan key={i} x={node.x + node.w / 2} y={first + i * LINE_H}>{line}</tspan>)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <figcaption className="text-xs text-ink/65">{alt}</figcaption>
      <details className="text-xs text-ink/70">
        <summary className="cursor-pointer font-semibold">Show the connections as a list</summary>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          {layout.edges.map((edge) => <li key={`${edge.from}>${edge.to}`}>{labelOf.get(edge.from)} → {labelOf.get(edge.to)}{edge.label ? `: ${edge.label}` : ""}</li>)}
          {diagram.nodes.filter((node) => !connected.has(node.id)).map((node) => <li key={node.id}>{node.label} (not connected)</li>)}
        </ul>
      </details>
    </figure>
  );
}
