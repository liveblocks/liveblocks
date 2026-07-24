import { getUser } from "@/app/database";
import clsx from "clsx";
import type { ReactNode } from "react";

const URL_PATTERN =
  /https?:\/\/[^\s<]+[^<.,:;"')\]\s]|\bwww\.[^\s<]+[^<.,:;"')\]\s]/gi;
const LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/;
const MENTION_PATTERN = /<@([^>]+)>/;
const CODE_PATTERN = /`([^`]+)`/;
const BOLD_PATTERN = /\*\*([^*]+)\*\*/;
const STRIKE_PATTERN = /~~([^~]+)~~/;

type InlineToken =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "strike"; value: string }
  | { type: "code"; value: string }
  | { type: "link"; label: string; href: string }
  | { type: "url"; href: string }
  | { type: "mention"; userId: string };

function nextInlineToken(
  text: string,
  index: number
): { token: InlineToken; length: number } | null {
  const slice = text.slice(index);

  const mention = slice.match(MENTION_PATTERN);
  if (mention?.index === 0) {
    return {
      token: { type: "mention", userId: mention[1] },
      length: mention[0].length,
    };
  }

  const link = slice.match(LINK_PATTERN);
  if (link?.index === 0) {
    return {
      token: { type: "link", label: link[1], href: link[2] },
      length: link[0].length,
    };
  }

  const code = slice.match(CODE_PATTERN);
  if (code?.index === 0) {
    return {
      token: { type: "code", value: code[1] },
      length: code[0].length,
    };
  }

  const bold = slice.match(BOLD_PATTERN);
  if (bold?.index === 0) {
    return {
      token: { type: "bold", value: bold[1] },
      length: bold[0].length,
    };
  }

  const strike = slice.match(STRIKE_PATTERN);
  if (strike?.index === 0) {
    return {
      token: { type: "strike", value: strike[1] },
      length: strike[0].length,
    };
  }

  const italicStar = slice.match(/^\*([^*]+)\*/);
  if (italicStar) {
    return {
      token: { type: "italic", value: italicStar[1] },
      length: italicStar[0].length,
    };
  }

  const italicUnderscore = slice.match(/^_([^_]+)_/);
  if (italicUnderscore) {
    return {
      token: { type: "italic", value: italicUnderscore[1] },
      length: italicUnderscore[0].length,
    };
  }

  const urlMatch = slice.match(URL_PATTERN);
  if (urlMatch?.index === 0) {
    const href = urlMatch[0].startsWith("http")
      ? urlMatch[0]
      : `https://${urlMatch[0]}`;
    return {
      token: { type: "url", href },
      length: urlMatch[0].length,
    };
  }

  const nextSpecial = slice.search(
    /`|\*\*|~~|\*|_|https?:\/\/|www\.|\[|<@/
  );
  const end = nextSpecial === -1 ? slice.length : nextSpecial;
  if (end === 0) {
    return {
      token: { type: "text", value: slice[0] ?? "" },
      length: 1,
    };
  }

  return {
    token: { type: "text", value: slice.slice(0, end) },
    length: end,
  };
}

function parseInline(text: string, keyPrefix: string) {
  const nodes: ReactNode[] = [];
  let index = 0;
  let part = 0;

  while (index < text.length) {
    const parsed = nextInlineToken(text, index);
    if (!parsed) {
      break;
    }

    const key = `${keyPrefix}-${part++}`;
    switch (parsed.token.type) {
      case "text":
        nodes.push(parsed.token.value);
        break;
      case "bold":
        nodes.push(
          <strong key={key}>{parseInline(parsed.token.value, key)}</strong>
        );
        break;
      case "italic":
        nodes.push(
          <em key={key}>{parseInline(parsed.token.value, key)}</em>
        );
        break;
      case "strike":
        nodes.push(
          <span key={key} className="line-through">
            {parseInline(parsed.token.value, key)}
          </span>
        );
        break;
      case "code":
        nodes.push(
          <code
            key={key}
            className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[0.9em] text-rose-700"
          >
            {parsed.token.value}
          </code>
        );
        break;
      case "link":
        nodes.push(
          <a
            key={key}
            href={parsed.token.href}
            target="_blank"
            rel="noreferrer noopener"
            className="text-sky-700 underline underline-offset-2 hover:text-sky-900"
          >
            {parseInline(parsed.token.label, key)}
          </a>
        );
        break;
      case "url":
        nodes.push(
          <a
            key={key}
            href={parsed.token.href}
            target="_blank"
            rel="noreferrer noopener"
            className="text-sky-700 underline underline-offset-2 hover:text-sky-900"
          >
            {parsed.token.href.replace(/^https?:\/\//, "")}
          </a>
        );
        break;
      case "mention": {
        const user = getUser(parsed.token.userId);
        const label = user?.info.name ?? parsed.token.userId;
        nodes.push(
          <span
            key={key}
            className={clsx(
              "mx-0.5 inline-flex items-center rounded-full bg-indigo-50 px-1.5 py-0.5 text-[0.9em] font-medium text-indigo-700"
            )}
          >
            @{label}
          </span>
        );
        break;
      }
    }

    index += parsed.length;
  }

  return nodes;
}

function parseBlocks(content: string) {
  const blocks: Array<
    | { type: "paragraph"; text: string }
    | { type: "code"; text: string }
  > = [];

  let remaining = content;

  while (remaining.length > 0) {
    const codeStart = remaining.indexOf("```");
    if (codeStart === -1) {
      for (const paragraph of remaining.split(/\n\n+/)) {
        const trimmed = paragraph.trim();
        if (trimmed) {
          blocks.push({ type: "paragraph", text: trimmed });
        }
      }
      break;
    }

    if (codeStart > 0) {
      for (const paragraph of remaining.slice(0, codeStart).split(/\n\n+/)) {
        const trimmed = paragraph.trim();
        if (trimmed) {
          blocks.push({ type: "paragraph", text: trimmed });
        }
      }
    }

    remaining = remaining.slice(codeStart + 3);
    const codeEnd = remaining.indexOf("\n```");
    if (codeEnd === -1) {
      blocks.push({ type: "code", text: remaining.replace(/^\n?/, "") });
      break;
    }

    blocks.push({
      type: "code",
      text: remaining.slice(0, codeEnd).replace(/^\n?/, ""),
    });
    remaining = remaining.slice(codeEnd + 4);
  }

  return blocks;
}

export function Markdown({ content }: { content: string }) {
  const blocks = parseBlocks(content);

  return (
    <div className="space-y-2 text-[15px] leading-relaxed text-neutral-800">
      {blocks.map((block, index) => {
        if (block.type === "code") {
          return (
            <pre
              key={index}
              className="overflow-x-auto rounded-lg bg-neutral-900 px-3 py-2 font-mono text-sm text-neutral-100"
            >
              <code>{block.text}</code>
            </pre>
          );
        }

        const lines = block.text.split("\n");
        return (
          <p key={index} className="whitespace-pre-wrap break-words">
            {lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                {parseInline(line, `p-${index}-${lineIndex}`)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
