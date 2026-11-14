import { Fragment, type ReactNode } from "react";

/**
 * Renders a tiny, safe markdown subset as React elements (never raw HTML):
 * **bold** / __bold__, *italic* / _italic_, line breaks and simple bullet or
 * numbered lists. Everything else is shown as plain text.
 */

const INLINE = /(\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\s][^*\n]*\*|_[^_\s][^_\n]*_)/g;

function inline(text: string, key: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (!part) return null;
    const k = `${key}-${i}`;
    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__")))
      return <strong key={k} className="font-semibold">{part.slice(2, -2)}</strong>;
    if (part.length > 2 && ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))))
      return <em key={k}>{part.slice(1, -1)}</em>;
    return <Fragment key={k}>{part}</Fragment>;
  });
}

const BULLET = /^\s*(?:[-*•]|\d+[.)])\s+/;
const HEADING = /^\s*#{1,6}\s+/;

type Block = { kind: "p"; lines: string[] } | { kind: "ul"; items: string[] };

function blocks(text: string): Block[] {
  const out: Block[] = [];
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.replace(HEADING, "").trimEnd();
    const last = out.at(-1);
    if (!line.trim()) {
      out.push({ kind: "p", lines: [] });
    } else if (BULLET.test(line)) {
      const item = line.replace(BULLET, "");
      if (last?.kind === "ul") last.items.push(item);
      else out.push({ kind: "ul", items: [item] });
    } else if (last?.kind === "p") {
      last.lines.push(line.trim());
    } else {
      out.push({ kind: "p", lines: [line.trim()] });
    }
  }
  return out.filter((b) => (b.kind === "p" ? b.lines.length > 0 : b.items.length > 0));
}

export function SafeMarkdown({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {blocks(text).map((b, i) =>
        b.kind === "ul" ? (
          <ul key={i} className="list-disc space-y-0.5 pl-5">
            {b.items.map((item, j) => (
              <li key={j}>{inline(item, `${i}-${j}`)}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>
            {b.lines.map((line, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(line, `${i}-${j}`)}
              </Fragment>
            ))}
          </p>
        ),
      )}
    </div>
  );
}
