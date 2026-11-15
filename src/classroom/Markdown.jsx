import "katex/dist/katex.min.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

const remarkPlugins = [remarkGfm, remarkMath];
// throwOnError: false shows a malformed formula as red source text instead of breaking the whole message.
const rehypePlugins = [[rehypeKatex, { strict: false, throwOnError: false }]];

// Raw HTML is never rendered (react-markdown's default), and links from tutor text open safely in a new tab.
const components = {
  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer nofollow">{children}</a>,
};

// Colours come from the theme tokens, so text stays readable in light, dark and sepia.
const PROSE = [
  "prose prose-sm max-w-none break-words",
  "[--tw-prose-body:rgb(var(--ink)_/_0.8)] [--tw-prose-headings:rgb(var(--ink))] [--tw-prose-bold:rgb(var(--ink))]",
  "[--tw-prose-links:rgb(var(--accent))] [--tw-prose-bullets:rgb(var(--ink)_/_0.4)] [--tw-prose-counters:rgb(var(--ink)_/_0.55)]",
  "[--tw-prose-code:rgb(var(--ink))] [--tw-prose-quotes:rgb(var(--ink)_/_0.8)] [--tw-prose-hr:rgb(var(--ink)_/_0.1)]",
  "[--tw-prose-th-borders:rgb(var(--ink)_/_0.2)] [--tw-prose-td-borders:rgb(var(--ink)_/_0.1)]",
  "[--tw-prose-pre-bg:rgb(var(--ink)_/_0.06)] [--tw-prose-pre-code:rgb(var(--ink))]",
  "prose-p:my-2 prose-li:my-0.5 [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex-display]:py-1",
].join(" ");

// Tutors often write a display equation on one line as $$...$$, which Markdown reads as small inline math.
// A line holding only such an equation becomes a proper display block.
function normalizeMath(text) {
  return text.replace(/^[ \t]*\$\$([^\n$]+?)\$\$[ \t]*$/gm, (_, tex) => `\n$$\n${tex}\n$$\n`);
}

export default function Md({ children, className = "" }) {
  return (
    <div className={`${PROSE} ${className}`}>
      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={components}>
        {typeof children === "string" ? normalizeMath(children) : ""}
      </ReactMarkdown>
    </div>
  );
}
