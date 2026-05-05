import {
  sanitizeUrl,
  type CommentBody,
  type CommentBodyInlineElement,
  type CommentBodyParagraph,
  type CommentBodyText,
} from "@liveblocks/core";
import {
  Lexer,
  type MarkedToken,
  type Token as DefaultToken,
  type Tokens,
} from "marked";

type MarkdownTextFormatting = Pick<
  CommentBodyText,
  "bold" | "italic" | "strikethrough" | "code"
>;

type Token = MarkedToken;
type AnyToken = Token | DefaultToken;

type MarkdownTableCell = {
  tokens: AnyToken[];
};

const MENTION_REGEX = /(^|[^A-Za-z0-9_.-])@([A-Za-z0-9_][A-Za-z0-9_.-]*)/g;

function tokenizeMarkdown(markdown: string): AnyToken[] {
  return new Lexer().lex(markdown);
}

function taskListPrefix(item: Tokens.ListItem): string {
  if (!item.task) {
    return "";
  }

  return item.checked ? "[x] " : "[ ] ";
}

function toCommentBodyText(
  text: string,
  formatting: MarkdownTextFormatting
): CommentBodyText {
  return {
    text,
    ...formatting,
  };
}

function appendPlainText(
  inlines: CommentBodyInlineElement[],
  text: string,
  formatting: MarkdownTextFormatting
): void {
  if (text.length === 0) {
    return;
  }

  inlines.push(toCommentBodyText(text, formatting));
}

function listIndent(listDepth: number): string {
  return "  ".repeat(listDepth);
}

function blockquotePrefix(blockquoteDepth: number): string {
  return blockquoteDepth > 0 ? "> ".repeat(blockquoteDepth) : "";
}

function prependTextToParagraph(
  paragraph: CommentBodyParagraph,
  textPrefix: string
): CommentBodyParagraph {
  if (textPrefix.length === 0) {
    return paragraph;
  }

  return {
    ...paragraph,
    children: [{ text: textPrefix }, ...paragraph.children],
  };
}

function appendTextWithMentions(
  inlines: CommentBodyInlineElement[],
  text: string,
  formatting: MarkdownTextFormatting
): void {
  let lastIndex = 0;

  for (const match of text.matchAll(MENTION_REGEX)) {
    const matchIndex = match.index;
    const prefix = match[1] ?? "";
    const mentionId = match[2];

    if (matchIndex === undefined || mentionId === undefined) {
      continue;
    }

    const textEndIndex = matchIndex + prefix.length;
    if (textEndIndex > lastIndex) {
      inlines.push(
        toCommentBodyText(text.slice(lastIndex, textEndIndex), formatting)
      );
    }

    inlines.push({
      type: "mention",
      kind: "user",
      id: mentionId,
    });

    lastIndex = textEndIndex + mentionId.length + 1;
  }

  if (lastIndex < text.length) {
    inlines.push(toCommentBodyText(text.slice(lastIndex), formatting));
  }
}

function appendFormattedInlinesFromTokens(
  inlines: CommentBodyInlineElement[],
  tokens: AnyToken[],
  formatting: MarkdownTextFormatting
): void {
  inlines.push(...tokensToCommentBodyInlines(tokens, formatting));
}

function listMarker(
  ordered: boolean,
  start: number | "",
  index: number
): string {
  if (!ordered) {
    return "- ";
  }

  const firstItemNumber = start === "" ? 1 : start;
  return `${firstItemNumber + index}. `;
}

function tokensToPlainText(tokens: AnyToken[], listDepth = 0): string {
  assertTokens(tokens);
  return tokens.map((t) => tokenToPlainText(t, listDepth)).join("");
}

function tokenToPlainText(token: Token, listDepth = 0): string {
  switch (token.type) {
    case "escape":
    case "html":
    case "codespan":
    case "text": {
      return token.text;
    }

    case "br": {
      return "\n";
    }

    case "strong":
    case "em":
    case "del":
    case "link": {
      return tokensToPlainText(token.tokens, 0);
    }

    case "image": {
      return token.text || token.href;
    }

    case "paragraph":
    case "heading": {
      return tokensToPlainText(token.tokens, listDepth);
    }

    case "blockquote": {
      return tokensToPlainText(token.tokens, listDepth);
    }

    case "list": {
      return token.items
        .map((item, index) =>
          listItemToText(item, token.ordered, token.start, index, listDepth)
        )
        .join("\n");
    }

    case "list_item": {
      return tokensToPlainText(token.tokens, listDepth);
    }

    case "code": {
      return token.text;
    }

    case "table": {
      return tableToMarkdownRows(token).join("\n");
    }

    case "space":
    case "hr": {
      return "";
    }

    default: {
      return "";
    }
  }
}

function listItemToText(
  item: Tokens.ListItem,
  ordered: boolean,
  start: number | "",
  index: number,
  listDepth: number
): string {
  const indent = listIndent(listDepth);
  const marker = listMarker(ordered, start, index);
  const prefix = indent + marker;
  return `${prefix}${tokensToPlainText(item.tokens, listDepth + 1)}`;
}

function tableToMarkdownRows(table: Tokens.Table): string[] {
  const rows = [table.header, ...table.rows];
  const markdownRows = rows.map((row) => {
    const cells = row.map((cell) => tableCellToText(cell));
    return `| ${cells.join(" | ")} |`;
  });

  if (markdownRows.length === 0) {
    return [];
  }

  const columnCount = table.header.length;
  const separatorRow = `| ${new Array(columnCount).fill("---").join(" | ")} |`;

  return [markdownRows[0], separatorRow, ...markdownRows.slice(1)].filter(
    (row): row is string => row !== undefined
  );
}

function tableCellToText(cell: MarkdownTableCell): string {
  return tokensToPlainText(cell.tokens);
}

function tokensToCommentBodyInlines(
  tokens: AnyToken[],
  formatting: MarkdownTextFormatting = {}
): CommentBodyInlineElement[] {
  assertTokens(tokens);
  const inlines: CommentBodyInlineElement[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case "escape":
      case "html":
      case "text": {
        appendTextWithMentions(inlines, token.text, formatting);
        break;
      }

      case "br": {
        inlines.push(toCommentBodyText("\n", formatting));
        break;
      }

      case "strong": {
        appendFormattedInlinesFromTokens(inlines, token.tokens, {
          ...formatting,
          bold: true,
        });
        break;
      }

      case "em": {
        appendFormattedInlinesFromTokens(inlines, token.tokens, {
          ...formatting,
          italic: true,
        });
        break;
      }

      case "del": {
        appendFormattedInlinesFromTokens(inlines, token.tokens, {
          ...formatting,
          strikethrough: true,
        });
        break;
      }

      case "codespan": {
        inlines.push(
          toCommentBodyText(token.text, {
            ...formatting,
            code: true,
          })
        );
        break;
      }

      case "link": {
        const href = sanitizeUrl(token.href);
        const text = tokensToPlainText(token.tokens, 0);

        if (href === null) {
          appendPlainText(inlines, text, formatting);
          break;
        }

        inlines.push({
          type: "link",
          url: href,
          text,
        });
        break;
      }

      case "image": {
        appendPlainText(inlines, token.raw, formatting);
        break;
      }

      default: {
        const text = tokenToPlainText(token, 0);
        if (text) {
          appendTextWithMentions(inlines, text, formatting);
        }
        break;
      }
    }
  }

  return inlines;
}

function tokenToCommentBodyParagraphs(
  token: Token,
  listDepth = 0,
  blockquoteDepth = 0
): CommentBodyParagraph[] {
  switch (token.type) {
    case "space":
    case "hr": {
      return [];
    }

    case "paragraph":
    case "heading": {
      const children = tokensToCommentBodyInlines(token.tokens);
      if (children.length === 0) {
        return [];
      }

      const headingPrefix =
        token.type === "heading" ? `${"#".repeat(token.depth)} ` : "";

      return [
        prependTextToParagraph(
          {
            type: "paragraph",
            children,
          },
          blockquotePrefix(blockquoteDepth) + headingPrefix
        ),
      ];
    }

    case "blockquote": {
      return tokensToCommentBodyParagraphs(
        token.tokens,
        listDepth,
        blockquoteDepth + 1
      );
    }

    case "list": {
      const indent = listIndent(listDepth);
      return token.items.flatMap((item, index) => {
        const marker = listMarker(token.ordered, token.start, index);
        const prefix = indent + marker + taskListPrefix(item);
        const quotePrefix = blockquotePrefix(blockquoteDepth);
        const paragraphs = tokensToCommentBodyParagraphs(
          item.tokens,
          listDepth + 1,
          blockquoteDepth
        );

        const [firstParagraph, ...remainingParagraphs] = paragraphs;

        if (!firstParagraph) {
          return [
            {
              type: "paragraph",
              children: [{ text: quotePrefix + prefix }],
            },
          ];
        }

        const [firstChild, ...remainingChildren] = firstParagraph.children;
        const firstChildText =
          firstChild !== undefined && "text" in firstChild
            ? firstChild.text
            : undefined;

        if (
          quotePrefix.length > 0 &&
          firstChild !== undefined &&
          typeof firstChildText === "string" &&
          firstChildText.startsWith(quotePrefix)
        ) {
          const firstParagraphWithListPrefix: CommentBodyParagraph = {
            ...firstParagraph,
            children: [
              {
                text:
                  quotePrefix +
                  prefix +
                  firstChildText.slice(quotePrefix.length),
              },
              ...remainingChildren,
            ],
          };

          return [firstParagraphWithListPrefix, ...remainingParagraphs];
        }

        return [
          prependTextToParagraph(firstParagraph, prefix),
          ...remainingParagraphs,
        ];
      });
    }

    case "list_item": {
      return tokensToCommentBodyParagraphs(
        token.tokens,
        listDepth,
        blockquoteDepth
      );
    }

    case "code": {
      return [
        prependTextToParagraph(
          {
            type: "paragraph",
            children: [{ text: token.text }],
          },
          blockquotePrefix(blockquoteDepth)
        ),
      ];
    }

    case "table": {
      const quotePrefix = blockquotePrefix(blockquoteDepth);
      return tableToMarkdownRows(token).map((row) => ({
        type: "paragraph",
        children: [{ text: quotePrefix + row }],
      }));
    }

    default: {
      const inlines = tokensToCommentBodyInlines([token]);

      return inlines.length > 0
        ? [
            prependTextToParagraph(
              {
                type: "paragraph",
                children: inlines,
              },
              blockquotePrefix(blockquoteDepth)
            ),
          ]
        : [];
    }
  }
}

function tokensToCommentBodyParagraphs(
  tokens: AnyToken[],
  listDepth = 0,
  blockquoteDepth = 0
): CommentBodyParagraph[] {
  assertTokens(tokens);
  return tokens.flatMap((token) =>
    tokenToCommentBodyParagraphs(token, listDepth, blockquoteDepth)
  );
}

/**
 * Marked.js' `Token` union type includes a `Generic` token type which is
 * too broad and makes narrowing difficult, we don't use generic/custom tokens
 * so we can assert the `Generic` type away.
 */
function assertTokens(_: AnyToken): asserts _ is Token;
function assertTokens(_: AnyToken[]): asserts _ is Token[];
function assertTokens(_: AnyToken | AnyToken[]): asserts _ is Token | Token[] {}

/**
 * Converts a Markdown string into a `CommentBody` object that can be used to write
 * comments with `createThread`, `createComment`, or `editComment`.
 *
 * This is a lossy conversion because `CommentBody` only supports paragraphs,
 * inline text formatting (bold, italic, strikethrough, code), links, and
 * `@mentions`. Unsupported features like headings, lists, tables, or blockquotes
 * are kept as plain text.
 */
export function markdownToCommentBody(markdown: string): CommentBody {
  return {
    version: 1,
    content: tokensToCommentBodyParagraphs(tokenizeMarkdown(markdown)),
  };
}
