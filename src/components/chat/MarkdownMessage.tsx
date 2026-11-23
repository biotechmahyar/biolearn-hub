import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { faNum } from "@/lib/format";

/**
 * Lightweight Markdown renderer for AI chat answers.
 *
 * Model replies arrive as Markdown text; showing them raw means a literal
 * "###" or "|" spills into the bubble. This parser turns the constructs the
 * assistant actually uses (headings, lists, tables, fenced code, quotes,
 * emphasis) into real elements. It never uses `dangerouslySetInnerHTML` —
 * everything is built from React elements, so message content cannot inject
 * markup into the page.
 *
 * Supported inline syntax: **bold**, *italic*, ~~strike~~, `code`,
 * ==highlight==, [label](https://…) and <span style="color:green">…</span>.
 * Emoji are sized deliberately (1.18em, baseline-aligned) so a reply reads
 * consistently instead of mixing giant and tiny glyphs.
 */

type Align = "start" | "left" | "center" | "right";

type Block =
  | { type: "code"; lang: string; code: string }
  | { type: "heading"; level: number; text: string }
  | { type: "hr" }
  | { type: "quote"; lines: string[] }
  | { type: "list"; items: FlatItem[] }
  | { type: "table"; head: string[]; align: Align[]; rows: string[][] }
  | { type: "paragraph"; lines: string[] };

type FlatItem = { text: string; indent: number; ordered: boolean };
type ListNode = { text: string; ordered: boolean; children: ListNode[] };

const EMOJI_RE =
  /(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}|[\u{1F3FB}-\u{1F3FF}])*|[\u{1F1E6}-\u{1F1FF}]{2})/gu;

const INLINE_RE = new RegExp(
  [
    "(`[^`\\n]+`)", // inline code
    "(\\*\\*[^*\\n]+\\*\\*)", // **bold**
    "(__[^_\\n]+__)", // __bold__
    "(~~[^~\\n]+~~)", // ~~strike~~
    "(==[^=\\n]+==)", // ==highlight==
    "(\\*[^*\\n]+\\*)", // *italic*
    "(_[^_\\n]+_)", // _italic_
    "(\\[[^\\]\\n]+\\]\\((?:https?:\\/\\/|\\/)[^)\\s]+\\))", // [label](url)
    "(<span[^>]*?>[\\s\\S]*?<\\/span>)", // <span style="color:…">
    "(<https?:\\/\\/[^>\\s]+>)", // <autolink>
    "(https?:\\/\\/[^\\s<>()]+)", // bare autolink
    "(<br\\s*\\/?>)", // line break
  ].join("|"),
  "gi",
);

/* ── inline ─────────────────────────────────────────────────────────────── */

function EmojiText({ text }: { text: string }) {
  if (!text) return null;
  const parts: ReactNode[] = [];
  let last = 0;
  let key = 0;
  EMOJI_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = EMOJI_RE.exec(text))) {
    if (match.index > last) {
      parts.push(<span key={`s${key++}`}>{text.slice(last, match.index)}</span>);
    }
    parts.push(
      <span key={`e${key++}`} className="inline-block align-[-0.12em] text-[1.18em] leading-none">
        {match[0]}
      </span>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    parts.push(<span key={`s${key++}`}>{text.slice(last)}</span>);
  }
  return <>{parts}</>;
}

function safeColor(raw: string): string | undefined {
  const value = raw.trim().toLowerCase();
  if (/^#[0-9a-f]{3,8}$/.test(value)) return value;
  if (/^[a-z]{3,20}$/.test(value)) return value;
  return undefined;
}

function renderInline(input: string, depth = 0): ReactNode[] {
  if (!input) return [];
  if (depth > 3) return [<EmojiText key="t" text={input} />];

  // A fresh regex per call: nested calls (bold inside a list item) would
  // otherwise share `lastIndex` with the outer scan and skip tokens.
  const scanner = new RegExp(INLINE_RE.source, "gi");
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = scanner.exec(input))) {
    if (match.index > last) {
      out.push(<EmojiText key={`t${key++}`} text={input.slice(last, match.index)} />);
    }
    const token = match[0];

    if (match[1]) {
      out.push(
        <code
          key={`c${key++}`}
          dir="ltr"
          className="mx-0.5 inline-block max-w-full rounded-md bg-muted px-1.5 py-0.5 align-baseline font-mono text-[0.86em] text-foreground"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (match[2] || match[3]) {
      out.push(
        <strong key={`b${key++}`} className="font-extrabold text-foreground">
          {renderInline(token.replace(/^(\*\*|__)|(\*\*|__)$/g, ""), depth + 1)}
        </strong>,
      );
    } else if (match[4]) {
      out.push(
        <s key={`s${key++}`} className="text-muted-foreground">
          {renderInline(token.slice(2, -2), depth + 1)}
        </s>,
      );
    } else if (match[5]) {
      out.push(
        <mark
          key={`m${key++}`}
          className="rounded bg-amber-200/70 px-0.5 text-foreground dark:bg-amber-300/30"
        >
          {renderInline(token.slice(2, -2), depth + 1)}
        </mark>,
      );
    } else if (match[6] || match[7]) {
      out.push(
        <em key={`i${key++}`}>{renderInline(token.slice(1, -1), depth + 1)}</em>,
      );
    } else if (match[8]) {
      const link = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      if (!link) {
        out.push(<EmojiText key={`t${key++}`} text={token} />);
      } else {
        out.push(
          <a
            key={`a${key++}`}
            href={link[2]}
            target="_blank"
            rel="noreferrer noopener"
            className="font-semibold text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
          >
            {link[1]}
          </a>,
        );
      }
    } else if (match[9]) {
      const span = token.match(/^<span([^>]*)>([\s\S]*)<\/span>$/i);
      const color = span?.[1]?.match(/color\s*:\s*([^;"]+)/i)?.[1];
      const style: CSSProperties | undefined = color ? { color: safeColor(color) } : undefined;
      out.push(
        <span key={`sp${key++}`} style={style} className={style ? "font-semibold" : undefined}>
          {renderInline(span?.[2] ?? token, depth + 1)}
        </span>,
      );
    } else if (match[10]) {
      const url = token.slice(1, -1);
      out.push(
        <a
          key={`a${key++}`}
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          dir="ltr"
          className="break-all font-medium text-primary underline decoration-primary/30 underline-offset-2"
        >
          {url}
        </a>,
      );
    } else if (match[11]) {
      out.push(
        <a
          key={`a${key++}`}
          href={token}
          target="_blank"
          rel="noreferrer noopener"
          dir="ltr"
          className="break-all font-medium text-primary underline decoration-primary/30 underline-offset-2"
        >
          {token}
        </a>,
      );
    } else if (match[12]) {
      out.push(<br key={`br${key++}`} />);
    } else {
      out.push(<EmojiText key={`t${key++}`} text={token} />);
    }

    last = match.index + token.length;
  }

  if (last < input.length) {
    out.push(<EmojiText key={`t${key++}`} text={input.slice(last)} />);
  }
  return out;
}

/* ── block parsing ──────────────────────────────────────────────────────── */

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isSeparatorRow(line: string): boolean {
  if (!line.includes("|")) return false;
  const cells = splitRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{2,}:?$/.test(cell));
}

function alignOf(cell: string): Align {
  const left = cell.startsWith(":");
  const right = cell.endsWith(":");
  if (left && right) return "center";
  if (left) return "left";
  if (right) return "right";
  // A plain `---` follows each message's own direction (RTL for Persian).
  return "start";
}

function startsBlock(line: string): boolean {
  const trimmed = line.trim();
  return (
    /^(`{3,}|~{3,})/.test(trimmed) ||
    /^#{1,6}\s+/.test(trimmed) ||
    /^([-*_])\s*(?:\1\s*){2,}$/.test(trimmed) ||
    /^>\s?/.test(trimmed) ||
    /^([-*+]|\d+[.)])\s+/.test(trimmed)
  );
}

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    // ``` fenced code block
    const fence = raw.match(/^\s*(`{3,}|~{3,})\s*([\w+#.-]*)\s*$/);
    if (fence) {
      const marker = fence[1].startsWith("`") ? "`" : "~";
      const lang = fence[2] ?? "";
      const body: string[] = [];
      i += 1;
      while (i < lines.length) {
        const closing = lines[i].trim();
        if (closing.startsWith(marker.repeat(3))) {
          i += 1;
          break;
        }
        body.push(lines[i]);
        i += 1;
      }
      blocks.push({ type: "code", lang, code: body.join("\n") });
      continue;
    }

    // # heading — also accepts models that omit the space (#تیتر) instead of
    // leaking a literal hash into the answer, as long as the line is short.
    const heading = raw.match(/^\s{0,3}(#{1,6})[ \t]*([^\s#>].*?)\s*#*\s*$/);
    if (heading && heading[2].length <= 100 && !heading[2].includes(" #")) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
      i += 1;
      continue;
    }

    // --- horizontal rule
    if (/^\s{0,3}([-*_])\s*(?:\1\s*){2,}$/.test(raw)) {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }

    // > blockquote
    if (/^\s{0,3}>\s?/.test(raw)) {
      const quote: string[] = [];
      while (i < lines.length && /^\s{0,3}>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s{0,3}>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "quote", lines: quote });
      continue;
    }

    // | table |
    if (trimmed.includes("|") && i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
      const head = splitRow(raw);
      const align = splitRow(lines[i + 1]).map(alignOf);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().includes("|") && lines[i].trim()) {
        const cells = splitRow(lines[i]);
        if (cells.length > 1 || head.length === 1) rows.push(cells);
        i += 1;
      }
      blocks.push({ type: "table", head, align, rows });
      continue;
    }

    // - list / 1. list
    const listMatch = raw.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
    if (listMatch) {
      const items: FlatItem[] = [];
      const baseIndent = listMatch[1].replace(/\t/g, "  ").length;
      const baseOrdered = /\d/.test(listMatch[2]);
      while (i < lines.length) {
        const item = lines[i].match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
        if (!item) break;
        const indent = item[1].replace(/\t/g, "  ").length;
        const ordered = /\d/.test(item[2]);
        // A bullet list followed by a numbered list is two lists, not one.
        if (indent === baseIndent && ordered !== baseOrdered) break;
        items.push({ text: item[3], indent, ordered });
        i += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    // paragraph
    const para: string[] = [trimmed];
    i += 1;
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i])) {
      // A table row pair must start its own block, not extend the paragraph.
      if (lines[i].includes("|") && i + 1 < lines.length && isSeparatorRow(lines[i + 1])) break;
      para.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ type: "paragraph", lines: para });
  }

  return blocks;
}

function buildTree(items: FlatItem[]): ListNode[] {
  const root: ListNode[] = [];
  const stack: { indent: number; node: ListNode }[] = [];

  for (const item of items) {
    const node: ListNode = { text: item.text, ordered: item.ordered, children: [] };
    while (stack.length > 0 && item.indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }
    if (stack.length > 0) stack[stack.length - 1].node.children.push(node);
    else root.push(node);
    stack.push({ indent: item.indent, node });
  }

  return root;
}

/* ── block components ───────────────────────────────────────────────────── */

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      dir="ltr"
      className="my-3 overflow-hidden rounded-2xl border border-slate-800 bg-[#0B1512] text-slate-100"
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-slate-400">
          {lang || "code"}
        </span>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
          {copied ? "کپی شد" : "کپی"}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-2.5 text-left text-[12px] leading-6">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}

function ListNodes({ nodes, depth = 0 }: { nodes: ListNode[]; depth?: number }) {
  return (
    <ul className={cn("my-2 space-y-1", depth === 0 ? "" : "mt-1.5")}>
      {nodes.map((node, index) => (
        <li key={`${depth}-${index}`} className="flex gap-2">
          {node.ordered ? (
            <span className="mt-0.5 shrink-0 font-mono text-[11px] font-bold text-primary">
              {faNum(index + 1)}.
            </span>
          ) : (
            <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-primary/50" />
          )}
          <div className="min-w-0 flex-1">
            {renderInline(node.text)}
            {node.children.length > 0 && <ListNodes nodes={node.children} depth={depth + 1} />}
          </div>
        </li>
      ))}
    </ul>
  );
}

const HEADING_CLASS: Record<number, string> = {
  1: "mt-4 text-[18px] font-extrabold leading-8 first:mt-0",
  2: "mt-3.5 text-[17px] font-extrabold leading-8 first:mt-0",
  3: "mt-3 text-[16px] font-bold leading-7 first:mt-0",
  4: "mt-2.5 text-[15px] font-bold leading-7 first:mt-0",
};

export function MarkdownMessage({ content, className }: { content: string; className?: string }) {
  const blocks = useMemo(() => parseBlocks(content ?? ""), [content]);

  return (
    // `dir="auto"` keeps bidi ordering right for English answers while the
    // explicit `text-right` still pins every answer to the right edge.
    <div
      dir="auto"
      className={cn(
        "min-w-0 text-right text-[14.5px] leading-8 [overflow-wrap:anywhere] sm:text-[15px]",
        className,
      )}
    >
      {blocks.map((block, index) => {
        switch (block.type) {
          case "code":
            return <CodeBlock key={index} lang={block.lang} code={block.code} />;
          case "heading": {
            const level = Math.min(block.level, 4);
            const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4";
            return (
              <Tag key={index} className={cn("text-foreground", HEADING_CLASS[level])}>
                {renderInline(block.text)}
              </Tag>
            );
          }
          case "hr":
            return <hr key={index} className="my-3 border-border" />;
          case "quote":
            return (
              <blockquote
                key={index}
                className="my-2.5 rounded-e-xl border-s-[3px] border-primary/40 bg-primary/5 px-3 py-1.5 text-muted-foreground"
              >
                {block.lines.map((line, lineIndex) => (
                  <p key={lineIndex}>{renderInline(line)}</p>
                ))}
              </blockquote>
            );
          case "list":
            return <ListNodes key={index} nodes={buildTree(block.items)} />;
          case "table":
            return (
              <div
                key={index}
                className="my-3 max-w-full overflow-x-auto rounded-xl border border-border"
              >
                <table className="w-full min-w-[280px] border-collapse text-[13px]">
                  <thead className="bg-muted/70">
                    <tr>
                      {block.head.map((cell, cellIndex) => (
                        <th
                          key={cellIndex}
                          className="border-b border-border px-2.5 py-2 text-start font-bold text-foreground"
                        >
                          {renderInline(cell)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="even:bg-muted/30">
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            style={{ textAlign: block.align[cellIndex] ?? "start" }}
                            className="border-b border-border/60 px-2.5 py-1.5 align-top last:border-b-0"
                          >
                            {renderInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "paragraph":
          default:
            return (
              <p key={index} className="my-1.5 first:mt-0 last:mb-0">
                {block.lines.map((line, lineIndex) => (
                  <span key={lineIndex}>
                    {lineIndex > 0 && <br />}
                    {renderInline(line)}
                  </span>
                ))}
              </p>
            );
        }
      })}
    </div>
  );
}

export default MarkdownMessage;
