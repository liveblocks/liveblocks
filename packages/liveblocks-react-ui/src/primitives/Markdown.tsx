import { Slot } from "@radix-ui/react-slot";
import { Lexer, type Tokens } from "marked";
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

  // Paragraph
  // Inline (text, strong, em, code, del)
  // Table
  // List
  // Separator (hr)
};

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

export interface MarkdownProps
  extends Omit<ComponentPropsWithSlot<"div">, "children"> {
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
  | Tokens.Escape;

const defaultComponents: MarkdownComponents = {
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
            <MemoizedBlockTokenComp
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

const MemoizedBlockTokenComp = memo(
  function ({
    token,
    components,
  }: {
    token: BlockToken;
    components?: Partial<MarkdownComponents>;
  }) {
    return <BlockTokenComp token={token} components={components} />;
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

export function BlockTokenComp({
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
      const tokens: BlockToken[] = [];
      for (let i = 0; i < token.tokens.length; i++) {
        switch (token.tokens[i]!.type) {
          case "space":
          case "code":
          case "blockquote":
          case "html":
          case "heading":
          case "hr":
          case "list":
          case "paragraph":
          case "table": {
            tokens.push(token.tokens[i] as BlockToken);
            break;
          }
          case "text": {
            const texts: Tokens.Text[] = [token.tokens[i] as Tokens.Text];
            while (
              i + 1 < token.tokens.length &&
              token.tokens[i + 1]!.type === "text"
            ) {
              i++;
              texts.push(token.tokens[i] as Tokens.Text);
            }
            tokens.push({
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

      const Blockquote = components?.Blockquote ?? defaultComponents.Blockquote;

      return (
        <Blockquote>
          {tokens.map((token, index) => {
            return (
              <BlockTokenComp
                token={token}
                key={index}
                components={components}
              />
            );
          })}
        </Blockquote>
      );
    }
    case "html": {
      return token.text;
    }
    case "heading": {
      const Heading = components?.Heading ?? defaultComponents.Heading;

      if (token.depth < 1 || token.depth > 6) {
        return null;
      }

      return (
        <Heading level={token.depth as 1 | 2 | 3 | 4 | 5 | 6}>
          {token.tokens.map((token, index) => (
            <InlineTokenComp
              key={index}
              token={token as InlineToken}
              components={components}
            />
          ))}
        </Heading>
      );
    }
    case "hr": {
      return <hr />;
    }
    case "list": {
      const ListTag = token.ordered ? "ol" : "ul";

      return (
        <ListTag>
          {token.items.map((item, index) => {
            // A 'loose' list item in Markdown is one where the content is wrapped in a paragraph (or potentially other block) token
            if (item.loose) {
              // If the list item is a task list item, we need to add a checkbox to the start of the token
              if (item.task) {
                const tokens = [...item.tokens];
                if (tokens[0]?.type === "paragraph") {
                  const token = tokens[0] as Tokens.Paragraph;
                  token.tokens.unshift(
                    {
                      type: "checkbox",
                      checked: item.checked,
                      raw: "",
                    },
                    {
                      type: "text",
                      text: " ",
                      raw: " ",
                      escaped: false,
                    }
                  );
                } else {
                  tokens.unshift(
                    {
                      type: "checkbox",
                      checked: item.checked,
                      raw: "",
                    },
                    {
                      type: "text",
                      text: " ",
                      raw: " ",
                      escaped: false,
                    }
                  );
                }

                const items: BlockToken[] = [];
                for (let i = 0; i < tokens.length; i++) {
                  switch (tokens[i]!.type) {
                    case "space":
                    case "code":
                    case "blockquote":
                    case "html":
                    case "heading":
                    case "hr":
                    case "list":
                    case "paragraph":
                    case "table": {
                      items.push(tokens[i] as BlockToken);
                      break;
                    }
                    case "text":
                    case "checkbox": {
                      const texts: (
                        | Tokens.Text
                        | {
                            type: "checkbox";
                            checked: boolean;
                            raw: string;
                            text: string;
                          }
                      )[] = [
                        tokens[i] as
                          | Tokens.Text
                          | {
                              type: "checkbox";
                              checked: boolean;
                              raw: string;
                              text: string;
                            },
                      ];
                      while (
                        i + 1 < tokens.length &&
                        tokens[i + 1]!.type === "text"
                      ) {
                        i++;
                        texts.push(tokens[i] as Tokens.Text);
                      }
                      items.push({
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

                return (
                  <li key={index}>
                    {items.map((token, index) => {
                      return (
                        <BlockTokenComp
                          token={token}
                          key={index}
                          components={components}
                        />
                      );
                    })}
                  </li>
                );
              } else {
                const tokens: BlockToken[] = [];
                for (let i = 0; i < item.tokens.length; i++) {
                  switch (item.tokens[i]!.type) {
                    case "space":
                    case "code":
                    case "blockquote":
                    case "html":
                    case "heading":
                    case "hr":
                    case "list":
                    case "paragraph":
                    case "table": {
                      tokens.push(item.tokens[i] as BlockToken);
                      break;
                    }
                    case "text": {
                      const texts: Tokens.Text[] = [
                        item.tokens[i] as Tokens.Text,
                      ];
                      while (
                        i + 1 < item.tokens.length &&
                        item.tokens[i + 1]!.type === "text"
                      ) {
                        i++;
                        texts.push(item.tokens[i] as Tokens.Text);
                      }
                      tokens.push({
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

                return (
                  <li key={index}>
                    {tokens.map((token, index) => {
                      return (
                        <BlockTokenComp
                          token={token}
                          key={index}
                          components={components}
                        />
                      );
                    })}
                  </li>
                );
              }
            } else {
              const Items: ReactNode = item.tokens.map((token, index) => {
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
                      <BlockTokenComp
                        token={token as BlockToken}
                        key={index}
                        components={components}
                      />
                    );
                  }
                  case "text": {
                    return (
                      <InlineTokenComp
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
              });
              if (item.task) {
                return (
                  <li key={index}>
                    <input type="checkbox" disabled checked={item.checked} />{" "}
                    {Items}
                  </li>
                );
              } else {
                return <li key={index}>{Items}</li>;
              }
            }
          })}
        </ListTag>
      );
    }
    case "paragraph": {
      return (
        <p>
          {token.tokens.map((token, index) => (
            <InlineTokenComp
              key={index}
              token={token as InlineToken}
              components={components}
            />
          ))}
        </p>
      );
    }
    case "table": {
      return (
        <table>
          <thead>
            <tr>
              {token.header.map((cell, index) => {
                return (
                  <th key={index} align={cell.align ?? undefined}>
                    {cell.tokens.map((token, index) => (
                      <InlineTokenComp
                        key={index}
                        token={token as InlineToken}
                        components={components}
                      />
                    ))}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {token.rows.map((row, index) => {
              return (
                <tr key={index}>
                  {row.map((cell, index) => {
                    return (
                      <td key={index} align={cell.align ?? undefined}>
                        {cell.tokens.map((token, index) => (
                          <InlineTokenComp
                            key={index}
                            token={token as InlineToken}
                            components={components}
                          />
                        ))}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    }
  }
}

function InlineTokenComp({
  token,
  components,
}: {
  token: InlineToken | { type: "checkbox"; checked: boolean };
  components: Partial<MarkdownComponents> | undefined;
}) {
  switch (token.type) {
    case "strong": {
      return (
        <strong>
          {token.tokens.map((token, index) => (
            <InlineTokenComp
              key={index}
              token={token as InlineToken}
              components={components}
            />
          ))}
        </strong>
      );
    }
    case "em": {
      return (
        <em>
          {token.tokens.map((token, index) => (
            <InlineTokenComp
              key={index}
              token={token as InlineToken}
              components={components}
            />
          ))}
        </em>
      );
    }
    case "codespan": {
      return <code>{parseHtmlEntities(token.text)}</code>;
    }
    case "br": {
      return <br />;
    }
    case "del": {
      return (
        <del>
          {token.tokens.map((token, index) => (
            <InlineTokenComp
              key={index}
              token={token as InlineToken}
              components={components}
            />
          ))}
        </del>
      );
    }
    case "link": {
      let href: string | null;
      try {
        const url = new URL(token.href);
        if (url.protocol === "http:" || url.protocol === "https:") {
          href = url.toString();
        } else {
          href = null;
        }
      } catch {
        href = null;
      }

      if (href === null) {
        return token.tokens.map((token, index) => (
          <InlineTokenComp
            key={index}
            token={token as InlineToken}
            components={components}
          />
        ));
      }

      const Link = components?.Link ?? defaultComponents.Link;

      return (
        <Link href={href} title={token.title ?? undefined}>
          {token.tokens.map((token, index) => (
            <InlineTokenComp
              key={index}
              token={token as InlineToken}
              components={components}
            />
          ))}
        </Link>
      );
    }
    case "image": {
      let href: string | null;
      try {
        const url = new URL(token.href);
        if (url.protocol === "http:" || url.protocol === "https:") {
          href = url.toString();
        } else {
          href = null;
        }
      } catch {
        href = null;
      }

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
        return token.tokens.map((token, index) => (
          <InlineTokenComp
            key={index}
            token={token as InlineToken}
            components={components}
          />
        ));
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

function parseHtmlEntities(input: string) {
  const document = new DOMParser().parseFromString(
    `<!doctype html><body>${input}`,
    "text/html"
  );

  return document.body.textContent;
}
