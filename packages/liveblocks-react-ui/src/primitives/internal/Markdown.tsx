import { Lexer, type Tokens } from "marked";
import { type ReactNode, useMemo } from "react";

export type MarkdownProps = {
  content: string;
};
export function Markdown({ content }: { content: string }) {
  const tokens = useMemo(() => {
    return new Lexer().lex(content);
  }, [content]);

  return tokens.map((token, index) => {
    return <BlockTokenComp token={token as BlockToken} key={index} />;
  });
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

export function BlockTokenComp({ token }: { token: BlockToken }) {
  switch (token.type) {
    case "space": {
      return null;
    }
    case "code": {
      let language: string | null = null;
      if (token.lang !== undefined) {
        language = token.lang.match(/^\S*/)?.[0] ?? null;
      }
      return (
        <pre data-language={language || undefined}>
          <code>{token.text}</code>
        </pre>
      );
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

      return (
        <blockquote>
          {tokens.map((token, index) => {
            return <BlockTokenComp token={token} key={index} />;
          })}
        </blockquote>
      );
    }
    case "html": {
      return token.text;
    }
    case "heading": {
      let HeadingTag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      switch (token.depth) {
        case 1:
          HeadingTag = "h1";
          break;
        case 2:
          HeadingTag = "h2";
          break;
        case 3:
          HeadingTag = "h3";
          break;
        case 4:
          HeadingTag = "h4";
          break;
        case 5:
          HeadingTag = "h5";
          break;
        case 6:
          HeadingTag = "h6";
          break;
        default:
          HeadingTag = "h1";
          break;
      }
      return (
        <HeadingTag>
          {token.tokens.map((token, index) => (
            <InlineTokenComp key={index} token={token as InlineToken} />
          ))}
        </HeadingTag>
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
                      return <BlockTokenComp token={token} key={index} />;
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
                      return <BlockTokenComp token={token} key={index} />;
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
                      <BlockTokenComp token={token as BlockToken} key={index} />
                    );
                  }
                  case "text": {
                    return (
                      <InlineTokenComp
                        token={token as Tokens.Text}
                        key={index}
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
            <InlineTokenComp key={index} token={token as InlineToken} />
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
function InlineTokenComp({
  token,
}: {
  token: InlineToken | { type: "checkbox"; checked: boolean };
}) {
  switch (token.type) {
    case "strong": {
      return (
        <strong>
          {token.tokens.map((token, index) => (
            <InlineTokenComp key={index} token={token as InlineToken} />
          ))}
        </strong>
      );
    }
    case "em": {
      return (
        <em>
          {token.tokens.map((token, index) => (
            <InlineTokenComp key={index} token={token as InlineToken} />
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
            <InlineTokenComp key={index} token={token as InlineToken} />
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
          <InlineTokenComp key={index} token={token as InlineToken} />
        ));
      }

      return (
        <a
          href={href}
          title={token.title ? token.title : undefined}
          target="_blank"
          rel="noopener noreferrer"
        >
          {token.tokens.map((token, index) => (
            <InlineTokenComp key={index} token={token as InlineToken} />
          ))}
        </a>
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

      return (
        <img src={href} alt={token.text} title={token.title ?? undefined} />
      );
    }
    case "text": {
      if (token.tokens !== undefined) {
        return token.tokens.map((token, index) => (
          <InlineTokenComp key={index} token={token as InlineToken} />
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

export function parseHtmlEntities(input: string) {
  const document = new DOMParser().parseFromString(
    `<!doctype html><body>${input}`,
    "text/html"
  );

  return document.body.textContent;
}
