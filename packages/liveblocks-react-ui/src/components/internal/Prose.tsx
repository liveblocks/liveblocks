import type { ComponentProps } from "react";

import { type GlobalComponents, useComponents } from "../../components";
import type {
  MarkdownComponents,
  MarkdownComponentsCodeBlockProps,
  MarkdownComponentsLinkProps,
} from "../../primitives/Markdown";
import { Markdown } from "../../primitives/Markdown";
import { cn } from "../../utils/cn";
import { CodeBlock as DefaultCodeBlock } from "./CodeBlock";

interface ProseProps extends ComponentProps<"div"> {
  content: string;
  components?: Partial<GlobalComponents & MarkdownComponents>;
}

function Link({ href, title, children }: MarkdownComponentsLinkProps) {
  const { Anchor } = useComponents();

  return (
    <Anchor href={href} title={title}>
      {children}
    </Anchor>
  );
}

function CodeBlock({ language, code }: MarkdownComponentsCodeBlockProps) {
  return <DefaultCodeBlock title={language || "Plain text"} code={code} />;
}

const defaultComponents: Partial<MarkdownComponents> = {
  Link,
  CodeBlock,
};

/**
 * This component renders Markdown content with `lb-prose`
 * styles and custom components (code blocks, etc)
 */
export function Prose({
  content,
  components,
  className,
  ...props
}: ProseProps) {
  return (
    <Markdown
      content={content}
      components={{ ...defaultComponents, ...components }}
      className={cn("lb-prose", className)}
      {...props}
    />
  );
}
