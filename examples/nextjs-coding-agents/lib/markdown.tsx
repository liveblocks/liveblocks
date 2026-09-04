import { getUser } from "@/app/database";
import { getSkill } from "@/lib/skills";
import type { ReactNode } from "react";

const URL_PATTERN =
  /https?:\/\/[^\s<]+[^<.,:;"')\]\s]|\bwww\.[^\s<]+[^<.,:;"')\]\s]/gi;
const LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/;
const MENTION_PATTERN = /<@([^>]+)>/;
const SKILL_PATTERN = /<skill:([a-z0-9-]+)>/;
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
  | { type: "mention"; userId: string }
  | { type: "skill"; skillId: string };

function nextInlineToken(
  text: string,
  index: number
): { token: InlineToken; length: number } | null {
  const slice = text.slice(index);

  const skill = slice.match(SKILL_PATTERN);
  if (skill?.index === 0) {
    return {
      token: { type: "skill", skillId: skill[1] },
      length: skill[0].length,
    };
  }

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
    /`|\*\*|~~|\*|_|https?:\/\/|www\.|\[|<@|<skill:/
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
        nodes.push(<em key={key}>{parseInline(parsed.token.value, key)}</em>);
        break;
      case "strike":
        nodes.push(
          <span key={key} className="line-through">
            {parseInline(parsed.token.value, key)}
          </span>
        );
        break;
      case "code":
        nodes.push(<code key={key}>{parsed.token.value}</code>);
        break;
      case "link":
        nodes.push(
          <a
            key={key}
            href={parsed.token.href}
            target="_blank"
            rel="noreferrer noopener"
            className="text-accent-foreground underline underline-offset-2 hover:opacity-80"
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
            className="text-accent-foreground underline underline-offset-2 hover:opacity-80"
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
            className="inline-flex items-center rounded bg-accent-soft px-1 py-0.5 font-medium leading-tight text-accent-foreground"
          >
            @{label}
          </span>
        );
        break;
      }
      case "skill": {
        const skill = getSkill(parsed.token.skillId);
        nodes.push(
          <span
            key={key}
            title={skill?.description}
            className="inline-flex items-center rounded border border-border bg-code-bg px-1 py-0.5 font-mono text-[0.85em] leading-tight"
          >
            /{skill?.name ?? parsed.token.skillId}
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
    { type: "paragraph"; text: string } | { type: "code"; text: string }
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

type Block =
  | { type: "paragraph"; text: string }
  | { type: "code"; text: string }
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "list"; ordered: boolean; items: string[] };

// Lists and headings are detected per paragraph, which is enough for the
// summaries a coding agent writes.
function refineParagraph(text: string): Block[] {
  const lines = text.split("\n");

  const heading = lines[0].match(/^(#{1,3})\s+(.*)$/);
  if (heading && lines.length === 1) {
    return [
      {
        type: "heading",
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2],
      },
    ];
  }

  const isBullet = lines.every((line) => /^\s*[-*•]\s+/.test(line));
  const isNumbered = lines.every((line) => /^\s*\d+[.)]\s+/.test(line));
  if (isBullet || isNumbered) {
    return [
      {
        type: "list",
        ordered: isNumbered,
        items: lines.map((line) =>
          line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "")
        ),
      },
    ];
  }

  // A heading directly followed by body text
  if (heading) {
    return [
      {
        type: "heading",
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2],
      },
      ...refineParagraph(lines.slice(1).join("\n")),
    ];
  }

  return [{ type: "paragraph", text }];
}

export function Markdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const blocks = parseBlocks(content).flatMap((block) =>
    block.type === "paragraph" ? refineParagraph(block.text) : [block]
  );

  return (
    <div className={className ?? "prose-chat text-sm leading-relaxed"}>
      {blocks.map((block, index) => {
        switch (block.type) {
          case "code":
            return (
              <pre key={index}>
                <code>{block.text}</code>
              </pre>
            );
          case "heading": {
            const Tag = `h${block.level}` as const;
            return (
              <Tag key={index}>{parseInline(block.text, `h-${index}`)}</Tag>
            );
          }
          case "list": {
            const Tag = block.ordered ? "ol" : "ul";
            return (
              <Tag key={index}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    {parseInline(item, `li-${index}-${itemIndex}`)}
                  </li>
                ))}
              </Tag>
            );
          }
          case "paragraph": {
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
          }
        }
      })}
    </div>
  );
}
