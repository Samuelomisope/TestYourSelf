// Turns the whiteboard into Markdown for download (Phase D5). Pure: the same normalised blocks the board draws are used,
// so the file never contains anything the board would not show. Formulas stay as $$ LaTeX, diagrams and charts as their
// text alternative plus the underlying connections or numbers.
import { drawableBlocks } from "./boardHelpers.js";

const oneLine = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const cell = (value) => oneLine(value).replace(/\|/g, "\\|");
const row = (cells) => `| ${cells.map(cell).join(" | ")} |`;
const table = (headers, rows) => [row(headers), row(headers.map(() => "---")), ...rows.map(row)].join("\n");

function blockMarkdown(block) {
  switch (block.kind) {
    case "TEXT":
      return block.text.trim();
    case "LIST":
      return block.items.map((item, i) => `${block.ordered ? `${i + 1}.` : "-"} ${oneLine(item)}`).join("\n");
    case "FORMULA":
      return `${block.markdown}${block.caption ? `\n\n*${oneLine(block.caption)}*` : ""}`;
    case "TABLE":
      return `${block.caption ? `**${oneLine(block.caption)}**\n\n` : ""}${table(block.headers, block.rows)}`;
    case "DIAGRAM": {
      const names = new Map((block.diagram?.nodes ?? []).map((node) => [node.id, node.label]));
      const links = (block.diagram?.edges ?? []).map((edge) => `- ${oneLine(names.get(edge.from))} → ${oneLine(names.get(edge.to))}${edge.label ? ` (${oneLine(edge.label)})` : ""}`);
      return `*Diagram: ${oneLine(block.alt)}*${links.length ? `\n\nConnections:\n${links.join("\n")}` : ""}`;
    }
    case "CHART": {
      const chart = block.chart;
      const data = chart ? `\n\n${table(["", ...chart.series.map((s) => s.name)], chart.labels.map((label, i) => [label, ...chart.series.map((s) => s.values[i])]))}` : "";
      return `*Chart: ${oneLine(block.alt)}*${data}`;
    }
    default:
      return "";
  }
}

/** The whole board as Markdown, one section per page. Pages with nothing drawable are left out; returns "" if nothing is left. */
export function boardToMarkdown(pages, { title = "" } = {}) {
  const sections = [];
  (Array.isArray(pages) ? pages : []).forEach((page, i) => {
    const body = drawableBlocks(page).map(blockMarkdown).filter(Boolean);
    if (!body.length) return;
    const name = oneLine(page?.title);
    sections.push([`## ${name ? `Step ${i + 1}: ${name}` : `Board ${i + 1}`}`, ...body].join("\n\n"));
  });
  if (!sections.length) return "";
  const heading = oneLine(title);
  return `${heading ? `# ${heading}: whiteboard\n\n` : "# Whiteboard\n\n"}${sections.join("\n\n")}\n`;
}

/** A safe file name for the download, e.g. "Limits & Continuity" -> "limits-continuity-whiteboard.md". */
export function boardFilename(title) {
  const slug = String(title ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/g, "");
  return `${slug || "lesson"}-whiteboard.md`;
}

/** Saves text as a file in the browser. Browser-only; not covered by the node tests. */
export function downloadText(filename, text, type = "text/markdown") {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
