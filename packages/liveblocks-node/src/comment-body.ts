import {
  type CommentBody,
  type CommentBodyInlineElement,
  type CommentBodyParagraph,
  type CommentBodyText,
  sanitizeUrl,
} from "@liveblocks/core";
import {
  Lexer,
  type MarkedToken,
  type Token as DefaultToken,
  Tokenizer,
  type Tokens,
} from "marked";

const MENTION_REGEX = /(^|[^A-Za-z0-9_.-])@([A-Za-z0-9_][A-Za-z0-9_.@-]*)/g;
const MENTION_TRAILING_PUNCTUATION_REGEX = /[.-]/;
const WHITESPACE_REGEX = /\s/;

type MarkdownTextFormatting = Pick<
  CommentBodyText,
  "bold" | "italic" | "strikethrough" | "code"
>;

type Token = MarkedToken;
type AnyToken = Token | DefaultToken;

/**
 * Marked.js's GFM `url` tokenizer autolinks both bare URLs (e.g.
 * `https://example.com`) and bare emails (e.g. `name@example.com`). We want to
 * keep URL autolinking, but skip email autolinking: emails inside a mention id
 * (e.g. `@email@example.com`) would otherwise be split across multiple tokens
 * and break mention parsing, and standalone emails are better left as plain
 * text in comment bodies.
 */
class MarkedCustomTokenizer extends Tokenizer {
  override url(src: string): Tokens.Link | undefined {
    const token = super.url(src);
    if (token?.href.startsWith("mailto:")) {
      return undefined;
    }
    return token;
  }
}

/**
 * Marked.js' `Token` union type includes a `Generic` token type which is
 * too broad and makes narrowing difficult, we don't use generic/custom tokens
 * so we can assert the `Generic` type away.
 */
function assertTokens(_: AnyToken): asserts _ is Token;
function assertTokens(_: AnyToken[]): asserts _ is Token[];
function assertTokens(_: AnyToken | AnyToken[]): asserts _ is Token | Token[] {}

function tokenizeMarkdown(markdown: string): AnyToken[] {
  return new Lexer({ gfm: true, tokenizer: new MarkedCustomTokenizer() }).lex(
    markdown
  );
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

function taskListPrefix(item: Tokens.ListItem): string {
  if (!item.task) {
    return "";
  }

  return item.checked ? "[x] " : "[ ] ";
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
  let cursor = 0;

  for (const match of text.matchAll(MENTION_REGEX)) {
    const prefix = match[1] ?? "";
    const rawId = match[2];
    if (match.index === undefined || rawId === undefined) {
      continue;
    }

    const atSignIndex = match.index + prefix.length;
    const idStart = atSignIndex + 1;
    let idEnd = idStart + rawId.length;

    // Trim trailing dots/hyphens that look like sentence punctuation
    // (e.g. "@stacy." -> "stacy"), but only when followed by whitespace or
    // end-of-input. Mid-word trailing punctuation like "@stacy.-next" is kept.
    while (
      idEnd > idStart &&
      MENTION_TRAILING_PUNCTUATION_REGEX.test(text.charAt(idEnd - 1)) &&
      (idEnd === text.length || WHITESPACE_REGEX.test(text.charAt(idEnd)))
    ) {
      idEnd -= 1;
    }

    if (atSignIndex > cursor) {
      inlines.push(
        toCommentBodyText(text.slice(cursor, atSignIndex), formatting)
      );
    }

    inlines.push({
      type: "mention",
      kind: "user",
      id: text.slice(idStart, idEnd),
    });

    cursor = idEnd;
  }

  if (cursor < text.length) {
    inlines.push(toCommentBodyText(text.slice(cursor), formatting));
  }
}

function appendFormattedInlinesFromTokens(
  inlines: CommentBodyInlineElement[],
  tokens: AnyToken[],
  formatting: MarkdownTextFormatting
): void {
  inlines.push(...tokensToCommentBodyInlines(tokens, formatting));
}

function tableAlignmentMarker(
  alignment: Tokens.Table["align"][number]
): string {
  switch (alignment) {
    case "left":
      return ":---";
    case "center":
      return ":---:";
    case "right":
      return "---:";
    default:
      return "---";
  }
}

function tableToMarkdownRows(table: Tokens.Table): string[] {
  const rows = [table.header, ...table.rows];
  const markdownRows = rows.map((row) => {
    const cells = row.map((cell) => tokensToPlainText(cell.tokens));
    return `| ${cells.join(" | ")} |`;
  });

  if (markdownRows.length === 0) {
    return [];
  }

  const separatorRow = `| ${table.align.map(tableAlignmentMarker).join(" | ")} |`;

  return [markdownRows[0], separatorRow, ...markdownRows.slice(1)].filter(
    (row): row is string => row !== undefined
  );
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
  const prefix = indent + marker + taskListPrefix(item);
  return `${prefix}${tokensToPlainText(item.tokens, listDepth + 1)}`;
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
        if (token.type === "text" && token.tokens?.length) {
          appendFormattedInlinesFromTokens(inlines, token.tokens, formatting);
        } else {
          appendTextWithMentions(inlines, token.text, formatting);
        }
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
      const quotePrefix = blockquotePrefix(blockquoteDepth);
      return token.items.flatMap((item, index) => {
        const marker = listMarker(token.ordered, token.start, index);
        const listPrefix = indent + marker + taskListPrefix(item);
        const paragraphs = tokensToCommentBodyParagraphs(
          item.tokens,
          listDepth + 1,
          0
        );

        const [firstParagraph, ...remainingParagraphs] = paragraphs;

        if (!firstParagraph) {
          return [
            {
              type: "paragraph",
              children: [{ text: quotePrefix + listPrefix }],
            },
          ];
        }

        const firstParagraphWithPrefixes = prependTextToParagraph(
          firstParagraph,
          quotePrefix + listPrefix
        );
        const remainingParagraphsWithQuotePrefix = remainingParagraphs.map(
          (paragraph) => prependTextToParagraph(paragraph, quotePrefix)
        );

        return [
          firstParagraphWithPrefixes,
          ...remainingParagraphsWithQuotePrefix,
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
