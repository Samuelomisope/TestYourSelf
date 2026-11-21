import { useEffect } from "react";
import { createPortal } from "react-dom";
import BoardBlock from "./BoardBlock";
import { drawableBlocks } from "./boardHelpers";

/**
 * A print-only copy of the whole whiteboard. It is rendered outside the app root; while it is mounted the page is marked
 * with data-print-board, and print CSS (index.css) hides the app and shows only this, always in light colours.
 * "Save as PDF" in the print dialog gives the PDF, so no PDF library is needed. Calls onDone when printing is over.
 */
export default function BoardPrint({ pages, title, onDone }) {
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-print-board", "");
    const finish = () => onDone();
    window.addEventListener("afterprint", finish);
    // Let the portal paint (KaTeX, SVG) before the dialog opens.
    const timer = window.setTimeout(() => {
      // Paper cannot expand a collapsed section, so the connection lists and data tables are opened for printing.
      document.querySelectorAll("#board-print details").forEach((el) => { el.open = true; });
      window.print();
    }, 150);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", finish);
      root.removeAttribute("data-print-board");
    };
  }, [onDone]);

  const printable = pages.map((page) => ({ page, blocks: drawableBlocks(page) })).filter((entry) => entry.blocks.length);
  return createPortal(
    <div id="board-print">
      <h1>{title ? `${title}: whiteboard` : "Whiteboard"}</h1>
      {printable.map(({ page, blocks }, i) => (
        <section key={page.key ?? i}>
          <h2>{page.title ? `Step ${pages.indexOf(page) + 1}: ${page.title}` : `Board ${pages.indexOf(page) + 1}`}</h2>
          {blocks.map((block, j) => <div key={block.key ?? j} className="board-print-block"><BoardBlock block={block} /></div>)}
        </section>
      ))}
    </div>,
    document.body,
  );
}
