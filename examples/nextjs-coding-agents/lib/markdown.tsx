"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import {
  isValidElement,
  useCallback,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import ReactMarkdown, {
  defaultUrlTransform,
  type Components,
  type ExtraProps,
} from "react-markdown";
import remarkGfm from "remark-gfm";
import { getUser } from "@/app/database";
import { getSkill } from "@/lib/skills";

const MENTION_PATTERN = /<@([^>\s]+)>/g;
const SKILL_PATTERN = /<skill:([a-z0-9-]+)>/g;

/**
 * Mentions and skills are stored as `<@userId>` and `<skill:id>` tokens,
 * which Markdown would treat as HTML and drop. Turn them into links with a
 * custom scheme first; the `a` renderer below turns those into chips.
 */
function prepareContent(content: string) {
  return content
    .replace(
      MENTION_PATTERN,
      (_, userId: string) => `[@${userId}](mention:${userId})`
    )
    .replace(
      SKILL_PATTERN,
      (_, skillId: string) => `[/${skillId}](skill:${skillId})`
    );
}

function Mention({ userId }: { userId: string }) {
  const user = getUser(userId);
  return (
    <span className="inline-flex items-center rounded bg-accent-soft px-1 py-0.5 font-medium leading-tight text-accent-foreground">
      @{user?.info.name ?? userId}
    </span>
  );
}

function SkillChip({ skillId }: { skillId: string }) {
  const skill = getSkill(skillId);
  return (
    <span
      title={skill?.description}
      className="inline-flex items-center rounded border border-border bg-code-bg px-1 py-0.5 font-mono text-[0.85em] leading-tight"
    >
      /{skill?.name ?? skillId}
    </span>
  );
}

// react-markdown passes the hast `node` along; keep it off the DOM.
function Anchor({
  href,
  children,
  node: _node,
  ...props
}: ComponentProps<"a"> & ExtraProps) {
  if (href?.startsWith("mention:")) {
    return <Mention userId={href.slice("mention:".length)} />;
  }
  if (href?.startsWith("skill:")) {
    return <SkillChip skillId={href.slice("skill:".length)} />;
  }
  return (
    <a
      {...props}
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-accent-foreground underline underline-offset-2 hover:opacity-80"
    >
      {children}
    </a>
  );
}

function extractText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractText).join("");
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractText(node.props.children);
  }
  return "";
}

/** Fenced code block with a language label and a copy button. */
function CodeBlock({ children }: ComponentProps<"pre">) {
  const [copied, setCopied] = useState(false);

  // react-markdown renders <pre><code className="language-ts">…</code></pre>
  const codeElement = isValidElement<{
    className?: string;
    children?: ReactNode;
  }>(children)
    ? children
    : null;
  const language =
    codeElement?.props.className?.match(/language-([\w+-]+)/)?.[1] ?? null;
  const text = extractText(children).replace(/\n$/, "");

  const copy = useCallback(() => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);

  return (
    <div className="code-block">
      <div className="code-block-header">
        <span>{language ?? "text"}</span>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy code"
          className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-panel-hover hover:text-foreground"
        >
          {copied ? (
            <CheckIcon className="size-3" />
          ) : (
            <CopyIcon className="size-3" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>{children}</pre>
    </div>
  );
}

function Table({
  children,
  node: _node,
  ...props
}: ComponentProps<"table"> & ExtraProps) {
  return (
    <div className="table-wrapper">
      <table {...props}>{children}</table>
    </div>
  );
}

const components: Components = {
  a: Anchor,
  pre: CodeBlock,
  table: Table,
};

// Let the mention/skill pseudo-schemes through; everything else gets the
// default http/https/mailto sanitizing.
function urlTransform(url: string) {
  if (url.startsWith("mention:") || url.startsWith("skill:")) {
    return url;
  }
  return defaultUrlTransform(url);
}

export function Markdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={className ?? "prose-chat text-sm leading-relaxed"}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
        urlTransform={urlTransform}
      >
        {prepareContent(content)}
      </ReactMarkdown>
    </div>
  );
}
