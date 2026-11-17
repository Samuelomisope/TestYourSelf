import { useId } from "react";
import { layoutChart } from "./chartLayout";

function Marker({ shape, x, y, color, children }) {
  const common = { fill: color, stroke: "currentColor", strokeOpacity: 0.25 };
  if (shape === "square") return <rect x={x - 4} y={y - 4} width="8" height="8" {...common}>{children}</rect>;
  if (shape === "triangle") return <polygon points={`${x},${y - 5.5} ${x + 5.5},${y + 4} ${x - 5.5},${y + 4}`} {...common}>{children}</polygon>;
  return <circle cx={x} cy={y} r="4.5" {...common}>{children}</circle>;
}

function Swatch({ style, bar }) {
  return (
    <svg width="28" height="12" aria-hidden="true" className="shrink-0">
      {bar ? <rect x="8" y="1" width="12" height="10" fill={style.color} /> : <>
        <line x1="0" x2="28" y1="6" y2="6" stroke={style.color} strokeWidth="2" strokeDasharray={style.dash || undefined} />
        <Marker shape={style.marker} x={14} y={6} color={style.color} />
      </>}
    </svg>
  );
}

/**
 * A line or bar chart drawn as SVG from the tutor's labels and numbers. Series differ by colour, line dash and marker
 * shape, and every mark has a tooltip; the same numbers are available as a table for anyone who cannot see the picture.
 */
export default function ChartBlock({ alt, chart }) {
  const uid = useId().replace(/:/g, "");
  const g = layoutChart(chart);
  const bar = g.kind === "bar";

  return (
    <figure className="space-y-2">
      {chart.series.length > 1 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/80">
          {g.marks.map((mark) => <li key={mark.name} className="flex items-center gap-1.5"><Swatch style={mark.style} bar={bar} />{mark.name}</li>)}
        </ul>
      )}
      <svg role="img" aria-labelledby={`${uid}-title`} viewBox={`0 0 ${g.width} ${g.height}`} className="mx-auto block h-auto w-full max-w-[440px] text-ink" style={{ fontSize: 12 }}>
        <title id={`${uid}-title`}>{alt}</title>
        {g.yTicks.map((tick) => (
          <g key={tick.value}>
            <line x1={g.plot.x} x2={g.plot.x + g.plot.w} y1={tick.y} y2={tick.y} stroke="currentColor" strokeOpacity="0.12" />
            <text x={g.plot.x - 8} y={tick.y} textAnchor="end" dominantBaseline="central" fill="currentColor" fillOpacity="0.7">{tick.text}</text>
          </g>
        ))}
        <line x1={g.plot.x} x2={g.plot.x} y1={g.plot.y} y2={g.plot.y + g.plot.h} stroke="currentColor" strokeOpacity="0.35" />
        <line x1={g.plot.x} x2={g.plot.x + g.plot.w} y1={g.baselineY} y2={g.baselineY} stroke="currentColor" strokeOpacity="0.5" />
        {g.xTicks.map((tick, i) => {
          const ty = g.plot.y + g.plot.h + (g.rotated ? 12 : 16);
          return <text key={i} x={tick.x} y={ty} textAnchor={g.rotated ? "end" : "middle"} transform={g.rotated ? `rotate(-35 ${tick.x} ${ty})` : undefined} fill="currentColor" fillOpacity="0.7">{tick.text}<title>{tick.full}</title></text>;
        })}
        {chart.xLabel && <text x={g.plot.x + g.plot.w / 2} y={g.height - 6} textAnchor="middle" fill="currentColor" fillOpacity="0.8" fontWeight="600">{chart.xLabel}</text>}
        {chart.yLabel && <text transform={`translate(12 ${g.plot.y + g.plot.h / 2}) rotate(-90)`} textAnchor="middle" fill="currentColor" fillOpacity="0.8" fontWeight="600">{chart.yLabel}</text>}
        {g.marks.map((mark) => bar ? (
          <g key={mark.name}>
            {mark.bars.map((b, i) => <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} fill={mark.style.color} fillOpacity="0.92"><title>{`${mark.name}: ${b.label} = ${b.value}`}</title></rect>)}
          </g>
        ) : (
          <g key={mark.name}>
            <path d={mark.path} fill="none" stroke={mark.style.color} strokeWidth="2" strokeDasharray={mark.style.dash || undefined} strokeLinejoin="round" strokeLinecap="round" />
            {mark.points.map((p, i) => <Marker key={i} shape={mark.style.marker} x={p.x} y={p.y} color={mark.style.color}><title>{`${mark.name}: ${p.label} = ${p.value}`}</title></Marker>)}
          </g>
        ))}
      </svg>
      <figcaption className="text-xs text-ink/65">{alt}</figcaption>
      <details className="text-xs text-ink/70">
        <summary className="cursor-pointer font-semibold">Show the data as a table</summary>
        <div className="mt-1 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr><th scope="col" className="border border-ink/15 bg-ink/5 px-2 py-1 text-left">{chart.xLabel || "Label"}</th>{chart.series.map((s) => <th key={s.name} scope="col" className="border border-ink/15 bg-ink/5 px-2 py-1 text-left">{s.name}</th>)}</tr></thead>
            <tbody>{chart.labels.map((label, i) => <tr key={i}><th scope="row" className="border border-ink/15 px-2 py-1 text-left font-medium">{label}</th>{chart.series.map((s) => <td key={s.name} className="border border-ink/15 px-2 py-1">{s.values[i]}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
