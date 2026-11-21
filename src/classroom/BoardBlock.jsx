import ChartBlock from "./ChartBlock";
import DiagramBlock from "./DiagramBlock";
import Md from "./Markdown";

// One block of the whiteboard. Shared by the board itself and by the print view.
export default function BoardBlock({ block }) {
  switch (block.kind) {
    case "TEXT":
      return <p className="text-[0.95rem] leading-relaxed text-ink/85">{block.text}</p>;
    case "LIST": {
      const List = block.ordered ? "ol" : "ul";
      return <List className={`${block.ordered ? "list-decimal" : "list-disc"} space-y-1 pl-6 text-[0.95rem] text-ink/85`}>{block.items.map((item, i) => <li key={i}>{item}</li>)}</List>;
    }
    case "FORMULA":
      return (
        <figure className="overflow-x-auto rounded-xl bg-ink/[0.04] px-3 py-1">
          <Md>{block.markdown}</Md>
          {block.caption && <figcaption className="pb-2 text-center text-xs text-ink/55">{block.caption}</figcaption>}
        </figure>
      );
    case "TABLE":
      return (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            {block.caption && <caption className="pb-1 text-left text-xs text-ink/55">{block.caption}</caption>}
            <thead><tr>{block.headers.map((header, i) => <th key={i} scope="col" className="border border-ink/15 bg-ink/5 px-2 py-1 text-left font-semibold">{header}</th>)}</tr></thead>
            <tbody>{block.rows.map((row, r) => <tr key={r}>{row.map((cell, c) => <td key={c} className="border border-ink/15 px-2 py-1">{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    case "DIAGRAM":
      return block.diagram ? <DiagramBlock alt={block.alt} diagram={block.diagram} /> : <TextAlternative block={block} />;
    case "CHART":
      return block.chart ? <ChartBlock alt={block.alt} chart={block.chart} /> : <TextAlternative block={block} />;
    default:
      return null;
  }
}

// A diagram or chart whose data could not be drawn still tells the student what it was meant to show.
function TextAlternative({ block }) {
  return (
    <figure className="rounded-xl border border-dashed border-ink/25 p-3 text-sm text-ink/75">
      <figcaption className="text-xs font-bold uppercase tracking-wider text-ink/45">{block.kind === "CHART" ? "Chart" : "Diagram"}</figcaption>
      <p className="mt-1">{block.alt}</p>
    </figure>
  );
}
