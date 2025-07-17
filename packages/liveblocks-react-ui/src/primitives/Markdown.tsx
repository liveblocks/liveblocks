import { assertNever, sanitizeUrl } from "@liveblocks/core";
import { Slot } from "@radix-ui/react-slot";
import { Lexer, type MarkedToken, type Token, type Tokens } from "marked";
import {
  type ComponentType,
  forwardRef,
  memo,
  type ReactNode,
  useMemo,
} from "react";

import type { ComponentPropsWithSlot } from "../types";

export type MarkdownComponents = {
  /**
   * The component used to render paragraphs.
   *
   * @example
   * ```md
   * A paragraph.
   *
   * Another paragraph.
   * ```
   * ```tsx
   * <Markdown
   *   components={{
   *     Paragraph: ({ children }) => <p className="...">{children}</p>
   *   }}
   * />
   * ```
   */
  Paragraph: ComponentType<MarkdownComponentsParagraphProps>;

  /**
   * The component used to render inline elements (bold, italic, strikethrough, and inline code).
   *
   * @example
   * ```md
   * **Bold**, _italic_, ~~strikethrough~~, and `inline code`.
   * ```
   * ```tsx
   * <Markdown
   *   components={{
   *     Inline: ({ type, children }) => {
   *       const Component = type;
   *       return <Component className="...">{children}</Component>;
   *     }
   *   }}
   * />
   * ```
   */
  Inline: ComponentType<MarkdownComponentsInlineProps>;

  /**
   * The component used to render links.
   *
   * @example
   * ```md
   * A [link](https://liveblocks.io).
   * ```
   * ```tsx
   * <Markdown
   *   components={{
   *     Link: ({ href, children }) => <a href={href} className="...">{children}</a>
   *   }}
   * />
   * ```
   */
  Link: ComponentType<MarkdownComponentsLinkProps>;

  /**
   * The component used to render headings.
   *
   * @example
   * ```md
   * # Heading 1
   * ## Heading 2
   * ### Heading 3
   * ```
   * ```tsx
   * <Markdown
   *   components={{
   *     Heading: ({ level, children }) => {
   *       const Heading = `h${level}` as const;
   *       return <Heading className="...">{children}</Heading>;
   *     }
   *   }}
   * />
   * ```
   */
  Heading: ComponentType<MarkdownComponentsHeadingProps>;

  /**
   * The component used to render blockquotes.
   *
   * @example
   * ```md
   * > A blockquote.
   * ```
   * ```tsx
   * <Markdown
   *   components={{
   *     Blockquote: ({ children }) => <blockquote className="...">{children}</blockquote>
   *   }}
   * />
   * ```
   */
  Blockquote: ComponentType<MarkdownComponentsBlockquoteProps>;

  /**
   * The component used to render code blocks.
   *
   * @example
   * ```md
   * `⁠`⁠`javascript
   * const a = 1;
   * `⁠`⁠`
   * ```
   * ```tsx
   * <Markdown
   *   components={{
   *     CodeBlock: ({ language, code }) => (
   *       <pre data-language={language} className="...">
   *         <code className="...">{code}</code>
   *       </pre>
   *     )
   *   }}
   * />
   * ```
   */
  CodeBlock: ComponentType<MarkdownComponentsCodeBlockProps>;

  /**
   * The component used to render images.
   *
   * @example
   * ```md
   * ![An image](https://liveblocks.io/logo.svg)
   * ```
   * ```tsx
   * <Markdown
   *   components={{
   *     Image: ({ src, alt }) => <img src={src} alt={alt} className="...">
   *   }}
   * />
   * ```
   */
  Image: ComponentType<MarkdownComponentsImageProps>;

  /**
   * The component used to render lists.
   *
   * @example
   * ```md
   * 1. An ordered list item
   * - An unordered list item
   * - [x] A checked list item
   * ```
   * ```tsx
   * <Markdown
   *   components={{
   *     List: ({ type, items }) => {
   *       const List = type === "ordered" ? "ol" : "ul";
   *       return (
   *         <List>
   *           {items.map((item, index) => (
   *             <li key={index}>
   *               {item.checked !== undefined && (
   *                 <input type="checkbox" disabled checked={item.checked} />{" "}
   *               )}
   *               {item.children}
   *             </li>
   *           ))}
   *         </List>
   *       );
   *     }
   *   }}
   * />
   * ```
   */
  List: ComponentType<MarkdownComponentsListProps>;

  /**
   * The component used to render tables.
   *
   * @example
   * ```md
   * | Heading 1 | Heading 2 |
   * |-----------|-----------|
   * | Cell 1    | Cell 2    |
   * | Cell 3    | Cell 4    |
   * ```
   * ```tsx
   * <Markdown
   *   components={{
   *     Table: ({ headings, rows }) => (
   *       <table>
   *         <thead>
   *           <tr>
   *             {headings.map(({ children }, index) => (
   *               <th key={index}>{children}</th>
   *             ))}
   *           </tr>
   *         </thead>
   *         <tbody>
   *           {rows.map((row, index) => (
   *             <tr key={index}>
   *               {row.map(({ children }, index) => (
   *                 <td key={index}>{children}</td>
   *               ))}
   *             </tr>
   *           ))}
   *         </tbody>
   *       </table>
   *     )
   *   }}
   * />
   * ```
   */
  Table: ComponentType<MarkdownComponentsTableProps>;

  /**
   * The component used to render separators.
   *
   * @example
   * ```md
   * ---
   * ```
   * ```tsx
   * <Markdown components={{ Separator: () => <hr className="..." /> }} />
   * ```
   */
  Separator: ComponentType;
};

export interface MarkdownComponentsInlineProps {
  type: "strong" | "em" | "code" | "del";
  children: ReactNode;
}

export interface MarkdownComponentsParagraphProps {
  children: ReactNode;
}

interface MarkdownComponentsTableCell {
  align?: "left" | "center" | "right";
  children: ReactNode;
}

export interface MarkdownComponentsTableProps {
  headings: MarkdownComponentsTableCell[];
  rows: MarkdownComponentsTableCell[][];
}

interface MarkdownComponentsListItem {
  checked?: boolean;
  children: ReactNode;
}

export interface MarkdownComponentsListProps {
  type: "ordered" | "unordered";
  items: MarkdownComponentsListItem[];
}

export interface MarkdownComponentsBlockquoteProps {
  children: ReactNode;
}

export interface MarkdownComponentsImageProps {
  src: string;
  alt: string;
  title?: string;
}

export interface MarkdownComponentsHeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: ReactNode;
}

export interface MarkdownComponentsLinkProps {
  href: string;
  title?: string;
  children: ReactNode;
}

export interface MarkdownComponentsCodeBlockProps {
  code: string;
  language?: string;
}

export interface MarkdownProps extends ComponentPropsWithSlot<"div"> {
  content: string;
  components?: Partial<MarkdownComponents>;
}

const defaultComponents: MarkdownComponents = {
  Paragraph: ({ children }) => {
    return <p>{children}</p>;
  },
  Inline: ({ type, children }) => {
    switch (type) {
      case "strong":
        return <strong>{children}</strong>;
      case "em":
        return <em>{children}</em>;
      case "code":
        return <code>{children}</code>;
      case "del":
        return <del>{children}</del>;
      default:
        assertNever(type, "Unknown inline type");
    }
  },
  CodeBlock: ({ language, code }) => {
    return (
      <pre data-language={language ?? undefined}>
        <code>{code}</code>
      </pre>
    );
  },
  Link: ({ href, title, children }) => {
    return (
      <a href={href} title={title} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
  Heading: ({ level, children }) => {
    const Heading = `h${level}` as const;

    return <Heading>{children}</Heading>;
  },
  Image: ({ src, alt, title }) => {
    return <img src={src} alt={alt} title={title} />;
  },
  Blockquote: ({ children }) => {
    return <blockquote>{children}</blockquote>;
  },
  Table: ({ headings, rows }) => {
    return (
      <table>
        <thead>
          <tr>
            {headings.map((heading, index) => {
              return (
                <th key={index} align={heading.align}>
                  {heading.children}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            return (
              <tr key={index}>
                {row.map((cell, index) => {
                  return (
                    <td key={index} align={cell.align}>
                      {cell.children}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  },
  List: ({ type, items }) => {
    const List = type === "ordered" ? "ol" : "ul";

    return (
      <List>
        {items.map((item, index) => (
          <li key={index}>
            {item.checked !== undefined && (
              <>
                <input type="checkbox" disabled checked={item.checked} />{" "}
              </>
            )}
            {item.children}
          </li>
        ))}
      </List>
    );
  },
  Separator: () => {
    return <hr />;
  },
};

export const Markdown = forwardRef<HTMLDivElement, MarkdownProps>(
  ({ content, components, asChild, ...props }, forwardedRef) => {
    const Component = asChild ? Slot : "div";
    const tokens = useMemo(() => {
      return new Lexer().lex(content);
    }, [content]);

    return (
      <Component {...props} ref={forwardedRef}>
        {tokens.map((token, index) => {
          return (
            <MemoizedMarkdownToken
              token={token}
              key={index}
              components={components}
            />
          );
        })}
      </Component>
    );
  }
);

const MemoizedMarkdownToken = memo(
  ({
    token,
    components,
  }: {
    token: Token;
    components?: Partial<MarkdownComponents>;
  }) => {
    return <MarkdownToken token={token} components={components} />;
  },
  (previousProps, nextProps) => {
    const previousToken = previousProps.token;
    const nextToken = nextProps.token;

    if (previousToken.raw.length !== nextToken.raw.length) {
      return false;
    }

    if (previousToken.type !== nextToken.type) {
      return false;
    }

    return previousToken.raw === nextToken.raw;
  }
);

export function MarkdownToken({
  token,
  components,
}: {
  token: Token;
  components: Partial<MarkdownComponents> | undefined;
}) {
  // Marked.js supports generic tokens, but we don't use them.
  if (!isMarkedToken(token)) {
    return null;
  }

  switch (token.type) {
    case "escape": {
      return token.text;
    }

    case "space": {
      return null;
    }

    case "text": {
      if (token.tokens !== undefined) {
        return <MarkdownTokens tokens={token.tokens} components={components} />;
      } else {
        return parseHtmlEntities(token.text);
      }
    }

    case "br": {
      return <br />;
    }

    case "paragraph": {
      const Paragraph = components?.Paragraph ?? defaultComponents.Paragraph;

      return (
        <Paragraph>
          <MarkdownTokens tokens={token.tokens} components={components} />
        </Paragraph>
      );
    }

    case "heading": {
      const Heading = components?.Heading ?? defaultComponents.Heading;

      return (
        <Heading level={clampHeadingLevel(token.depth)}>
          <MarkdownTokens tokens={token.tokens} components={components} />
        </Heading>
      );
    }

    case "strong": {
      const Inline = components?.Inline ?? defaultComponents.Inline;

      return (
        <Inline type="strong">
          <MarkdownTokens tokens={token.tokens} components={components} />
        </Inline>
      );
    }

    case "em": {
      const Inline = components?.Inline ?? defaultComponents.Inline;

      return (
        <Inline type="em">
          <MarkdownTokens tokens={token.tokens} components={components} />
        </Inline>
      );
    }

    case "codespan": {
      const Inline = components?.Inline ?? defaultComponents.Inline;

      return <Inline type="code">{parseHtmlEntities(token.text)}</Inline>;
    }

    case "del": {
      const Inline = components?.Inline ?? defaultComponents.Inline;

      return (
        <Inline type="del">
          <MarkdownTokens tokens={token.tokens} components={components} />
        </Inline>
      );
    }

    case "link": {
      const href = sanitizeUrl(token.href);

      if (href === null) {
        return <MarkdownTokens tokens={token.tokens} components={components} />;
      }

      const Link = components?.Link ?? defaultComponents.Link;

      return (
        <Link href={href} title={token.title ?? undefined}>
          <MarkdownTokens tokens={token.tokens} components={components} />
        </Link>
      );
    }

    case "code": {
      let language: string | undefined = undefined;
      if (token.lang !== undefined) {
        language = token.lang.match(/^\S*/)?.[0] ?? undefined;
      }

      const CodeBlock = components?.CodeBlock ?? defaultComponents.CodeBlock;

      return <CodeBlock language={language} code={token.text} />;
    }

    case "blockquote": {
      const Blockquote = components?.Blockquote ?? defaultComponents.Blockquote;

      return (
        <Blockquote>
          <MarkdownTokens
            tokens={token.tokens}
            components={components}
            normalizeToBlockTokens
          />
        </Blockquote>
      );
    }

    case "list": {
      const List = components?.List ?? defaultComponents.List;
      const items: MarkdownComponentsListItem[] = token.items.map((item) => {
        return {
          checked: item.task ? item.checked : undefined,
          children: (
            <MarkdownTokens
              tokens={item.tokens}
              components={components}
              // A "loose" list item in Markdown is one where the content is wrapped in a paragraph (or potentially other block) token
              normalizeToBlockTokens={item.loose}
            />
          ),
        };
      });

      return (
        <List type={token.ordered ? "ordered" : "unordered"} items={items} />
      );
    }

    case "table": {
      const Table = components?.Table ?? defaultComponents.Table;
      const headings: MarkdownComponentsTableCell[] = token.header.map(
        (cell) => ({
          align: cell.align ?? undefined,
          children: (
            <MarkdownTokens tokens={cell.tokens} components={components} />
          ),
        })
      );

      const rows: MarkdownComponentsTableCell[][] = token.rows.map((row) =>
        row.map((cell) => ({
          align: cell.align ?? undefined,
          children: (
            <MarkdownTokens tokens={cell.tokens} components={components} />
          ),
        }))
      );

      return <Table headings={headings} rows={rows} />;
    }

    case "image": {
      const href = sanitizeUrl(token.href);

      if (href === null) {
        return token.text;
      }

      const Image = components?.Image ?? defaultComponents.Image;

      return (
        <Image src={href} alt={token.text} title={token.title ?? undefined} />
      );
    }

    case "hr": {
      const Separator = components?.Separator ?? defaultComponents.Separator;

      return <Separator />;
    }

    // HTML elements/tokens are not supported (yet).
    case "html":
    default: {
      return null;
    }
  }
}

function MarkdownTokens({
  tokens,
  components,
  normalizeToBlockTokens = false,
}: {
  tokens: Token[];
  components: Partial<MarkdownComponents> | undefined;
  normalizeToBlockTokens?: boolean;
}) {
  const normalizedTokens: Token[] = [];

  if (normalizeToBlockTokens) {
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]!;

      switch (token.type) {
        case "text": {
          // Wrap consecutive text tokens into a paragraph
          const texts: Tokens.Text[] = [token as Tokens.Text];
          while (i + 1 < tokens.length && tokens[i + 1]!.type === "text") {
            i++;
            texts.push(tokens[i] as Tokens.Text);
          }

          normalizedTokens.push({
            type: "paragraph",
            tokens: texts,
            raw: texts.map((text) => text.raw).join(""),
            text: texts.map((text) => text.text).join(""),
          } satisfies Tokens.Paragraph);

          break;
        }

        default: {
          normalizedTokens.push(token);
        }
      }
    }
  }

  return tokens.map((token, index) => (
    <MarkdownToken key={index} token={token} components={components} />
  ));
}

const markedTokenTypes = [
  "blockquote",
  "br",
  "code",
  "codespan",
  "def",
  "del",
  "em",
  "escape",
  "heading",
  "hr",
  "html",
  "image",
  "link",
  "list",
  "list_item",
  "paragraph",
  "space",
  "strong",
  "table",
  "text",
] as const satisfies MarkedToken["type"][];

function isMarkedToken(token: unknown): token is MarkedToken {
  return (
    typeof token === "object" &&
    token !== null &&
    "type" in token &&
    markedTokenTypes.includes(token.type as MarkedToken["type"])
  );
}

function parseHtmlEntities(input: string) {
  const document = new DOMParser().parseFromString(
    `<!doctype html><body>${input}`,
    "text/html"
  );

  return document.body.textContent;
}

function clampHeadingLevel(level: number) {
  return Math.max(1, Math.min(6, level)) as 1 | 2 | 3 | 4 | 5 | 6;
}
