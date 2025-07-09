import { assertNever, sanitizeUrl } from "@liveblocks/core";
import { Slot } from "@radix-ui/react-slot";
import { Lexer, type Token, type Tokens } from "marked";
import {
  type ComponentType,
  forwardRef,
  memo,
  type ReactNode,
  useMemo,
} from "react";

import type { ComponentPropsWithSlot } from "../types";

export type MarkdownComponents = {
  CodeBlock: ComponentType<MarkdownComponentsCodeBlockProps>;
  Link: ComponentType<MarkdownComponentsLinkProps>;
  Heading: ComponentType<MarkdownComponentsHeadingProps>;
  Image: ComponentType<MarkdownComponentsImageProps>;
  Blockquote: ComponentType<MarkdownComponentsBlockquoteProps>;
  Table: ComponentType<MarkdownComponentsTableProps>;
  List: ComponentType<MarkdownComponentsListProps>;
  Paragraph: ComponentType<MarkdownComponentsParagraphProps>;
  Inline: ComponentType<MarkdownComponentsInlineProps>;
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

/**
 * Block level tokens include:
 * - space
 * - code
 * - blockquote
 * - html
 * - heading
 * - hr
 * - list
 * - paragraph
 * - table
 */
export type BlockToken =
  | Tokens.Space
  | Tokens.Code
  | Tokens.Blockquote
  | Tokens.HTML
  | Tokens.Heading
  | Tokens.Hr
  | Tokens.List
  | Tokens.Paragraph
  | Tokens.Table;

/**
 * Inline tokens include:
 * - strong
 * - em
 * - codespan
 * - br
 * - del
 * - link
 * - image
 * - text
 */
type InlineToken =
  | Tokens.Strong
  | Tokens.Em
  | Tokens.Codespan
  | Tokens.Br
  | Tokens.Del
  | Tokens.Link
  | Tokens.Image
  | Tokens.Text
  | Tokens.Escape
  | CheckboxToken;

type CheckboxToken = {
  type: "checkbox";
  checked: boolean;
  raw: string;
};

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
            <MemoizedMarkdownBlockToken
              token={token as BlockToken}
              key={index}
              components={components}
            />
          );
        })}
      </Component>
    );
  }
);

const MemoizedMarkdownBlockToken = memo(
  ({
    token,
    components,
  }: {
    token: BlockToken;
    components?: Partial<MarkdownComponents>;
  }) => {
    return <MarkdownBlockToken token={token} components={components} />;
  },
  (prevProps, nextProps) => {
    const prevToken = prevProps.token;
    const nextToken = nextProps.token;
    if (prevToken.raw.length !== nextToken.raw.length) {
      return false;
    }
    if (prevToken.type !== nextToken.type) {
      return false;
    }
    return prevToken.raw === nextToken.raw;
  }
);

export function MarkdownBlockToken({
  token,
  components,
}: {
  token: BlockToken;
  components: Partial<MarkdownComponents> | undefined;
}) {
  switch (token.type) {
    case "space": {
      return null;
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
      const tokens = normalizeToBlockTokens(token.tokens);
      const Blockquote = components?.Blockquote ?? defaultComponents.Blockquote;

      return (
        <Blockquote>
          <MarkdownBlockTokens tokens={tokens} components={components} />
        </Blockquote>
      );
    }
    case "html": {
      return token.text;
    }
    case "heading": {
      const Heading = components?.Heading ?? defaultComponents.Heading;

      return (
        <Heading level={clampHeadingLevel(token.depth)}>
          <MarkdownInlineTokens
            tokens={token.tokens as InlineToken[]}
            components={components}
          />
        </Heading>
      );
    }
    case "hr": {
      const Separator = components?.Separator ?? defaultComponents.Separator;

      return <Separator />;
    }
    case "list": {
      const List = components?.List ?? defaultComponents.List;
      const items: MarkdownComponentsListItem[] = token.items.map((item) => {
        // A 'loose' list item in Markdown is one where the content is wrapped in a paragraph (or potentially other block) token
        if (item.loose) {
          // If the list item is a task list item, we need to add a checkbox to the start of the token
          if (item.task) {
            const tokens = [...item.tokens];
            const checkboxTokens: InlineToken[] = [
              {
                type: "checkbox",
                checked: item.checked ?? false,
                raw: "",
              },
              {
                type: "text",
                text: " ",
                raw: " ",
                escaped: false,
              },
            ];

            if (tokens[0]?.type === "paragraph") {
              const paragraphToken = tokens[0];
              if (paragraphToken.tokens) {
                paragraphToken.tokens.unshift(...checkboxTokens);
              }
            } else {
              tokens.unshift(...checkboxTokens);
            }

            return {
              checked: item.checked,
              children: normalizeToBlockTokens(tokens).map((token, index) => (
                <MarkdownBlockToken
                  token={token}
                  key={index}
                  components={components}
                />
              )),
            };
          } else {
            return {
              children: normalizeToBlockTokens(item.tokens).map(
                (token, index) => (
                  <MarkdownBlockToken
                    token={token}
                    key={index}
                    components={components}
                  />
                )
              ),
            };
          }
        } else {
          return {
            checked: item.task ? item.checked : undefined,
            // Non-'loose' list items aren't wrapped in a paragraph
            children: item.tokens.map((token, index) => {
              switch (token.type) {
                case "space":
                case "code":
                case "blockquote":
                case "html":
                case "heading":
                case "hr":
                case "list":
                case "paragraph":
                case "table": {
                  return (
                    <MarkdownBlockToken
                      token={token as BlockToken}
                      key={index}
                      components={components}
                    />
                  );
                }
                case "text": {
                  return (
                    <MarkdownInlineToken
                      token={token as Tokens.Text}
                      key={index}
                      components={components}
                    />
                  );
                }
                default: {
                  return null;
                }
              }
            }),
          };
        }
      });

      return (
        <List type={token.ordered ? "ordered" : "unordered"} items={items} />
      );
    }
    case "paragraph": {
      const Paragraph = components?.Paragraph ?? defaultComponents.Paragraph;

      return (
        <Paragraph>
          <MarkdownInlineTokens
            tokens={token.tokens as InlineToken[]}
            components={components}
          />
        </Paragraph>
      );
    }
    case "table": {
      const Table = components?.Table ?? defaultComponents.Table;
      const headings: MarkdownComponentsTableCell[] = token.header.map(
        (cell) => ({
          align: cell.align ?? undefined,
          children: (
            <MarkdownInlineTokens
              tokens={cell.tokens as InlineToken[]}
              components={components}
            />
          ),
        })
      );

      const rows: MarkdownComponentsTableCell[][] = token.rows.map((row) =>
        row.map((cell) => ({
          align: cell.align ?? undefined,
          children: (
            <MarkdownInlineTokens
              tokens={cell.tokens as InlineToken[]}
              components={components}
            />
          ),
        }))
      );

      return <Table headings={headings} rows={rows} />;
    }
  }
}

function MarkdownInlineToken({
  token,
  components,
}: {
  token: InlineToken;
  components: Partial<MarkdownComponents> | undefined;
}) {
  switch (token.type) {
    case "strong": {
      const Inline = components?.Inline ?? defaultComponents.Inline;

      return (
        <Inline type="strong">
          <MarkdownInlineTokens
            tokens={token.tokens as InlineToken[]}
            components={components}
          />
        </Inline>
      );
    }
    case "em": {
      const Inline = components?.Inline ?? defaultComponents.Inline;

      return (
        <Inline type="em">
          <MarkdownInlineTokens
            tokens={token.tokens as InlineToken[]}
            components={components}
          />
        </Inline>
      );
    }
    case "codespan": {
      const Inline = components?.Inline ?? defaultComponents.Inline;

      return <Inline type="code">{parseHtmlEntities(token.text)}</Inline>;
    }
    case "br": {
      return <br />;
    }
    case "del": {
      const Inline = components?.Inline ?? defaultComponents.Inline;

      return (
        <Inline type="del">
          <MarkdownInlineTokens
            tokens={token.tokens as InlineToken[]}
            components={components}
          />
        </Inline>
      );
    }
    case "link": {
      const href = sanitizeUrl(token.href);

      if (href === null) {
        return (
          <MarkdownInlineTokens
            tokens={token.tokens as InlineToken[]}
            components={components}
          />
        );
      }

      const Link = components?.Link ?? defaultComponents.Link;

      return (
        <Link href={href} title={token.title ?? undefined}>
          <MarkdownInlineTokens
            tokens={token.tokens as InlineToken[]}
            components={components}
          />
        </Link>
      );
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
    case "text": {
      if (token.tokens !== undefined) {
        return (
          <MarkdownInlineTokens
            tokens={token.tokens as InlineToken[]}
            components={components}
          />
        );
      } else {
        return parseHtmlEntities(token.text);
      }
    }
    case "escape": {
      return token.text;
    }
    case "checkbox": {
      return <input type="checkbox" disabled checked={token.checked} />;
    }
    default: {
      return null;
    }
  }
}

function MarkdownBlockTokens({
  tokens,
  components,
}: {
  tokens: BlockToken[];
  components: Partial<MarkdownComponents> | undefined;
}) {
  return tokens.map((token, index) => (
    <MarkdownBlockToken key={index} token={token} components={components} />
  ));
}

function MarkdownInlineTokens({
  tokens,
  components,
}: {
  tokens: InlineToken[];
  components: Partial<MarkdownComponents> | undefined;
}) {
  return tokens.map((token, index) => (
    <MarkdownInlineToken key={index} token={token} components={components} />
  ));
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

function normalizeToBlockTokens(tokens: Token[]): BlockToken[] {
  const blocks: BlockToken[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;

    switch (token.type) {
      case "space":
      case "code":
      case "blockquote":
      case "html":
      case "heading":
      case "hr":
      case "list":
      case "paragraph":
      case "table": {
        blocks.push(token as BlockToken);
        break;
      }

      case "text": {
        // Group consecutive text tokens into a paragraph
        const texts: Tokens.Text[] = [token as Tokens.Text];
        while (i + 1 < tokens.length && tokens[i + 1]!.type === "text") {
          i++;
          texts.push(tokens[i] as Tokens.Text);
        }
        blocks.push({
          type: "paragraph",
          tokens: texts,
          raw: texts.map((text) => text.raw).join(""),
          text: texts.map((text) => text.text).join(""),
        } satisfies Tokens.Paragraph);

        break;
      }

      default: {
        continue;
      }
    }
  }

  return blocks;
}
