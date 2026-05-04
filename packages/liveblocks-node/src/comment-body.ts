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

function parseMarkdownTokens(markdown: string): AnyToken[] {
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

function listIndent(listDepth: number): string {
  return "  ".repeat(listDepth);
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

function appendFormattedInlineChildren(
  inlines: CommentBodyInlineElement[],
  tokens: AnyToken[],
  formatting: MarkdownTextFormatting
): void {
  inlines.push(...markdownTokensToCommentBodyInlines(tokens, formatting));
}

function listMarker(
  ordered: boolean,
  start: number | "",
  index: number
): string {
  return ordered ? `${(start || 1) + index}. ` : "- ";
}

function markdownTokensToPlainText(tokens: AnyToken[], listDepth = 0): string {
  assertTokens(tokens);
  return tokens.map((t) => markdownTokenToPlainText(t, listDepth)).join("");
}

function markdownTokenToPlainText(token: Token, listDepth = 0): string {
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
      return markdownTokensToPlainText(token.tokens, 0);
    }

    case "image": {
      return token.text || token.href;
    }

    case "paragraph":
    case "heading": {
      return markdownTokensToPlainText(token.tokens, listDepth);
    }

    case "blockquote": {
      return markdownTokensToPlainText(token.tokens, listDepth);
    }

    case "list": {
      return token.items
        .map((item, index) =>
          listItemToPlainText(
            item,
            token.ordered,
            token.start,
            index,
            listDepth
          )
        )
        .join("\n");
    }

    case "list_item": {
      return markdownTokensToPlainText(token.tokens, listDepth);
    }

    case "code": {
      return token.text;
    }

    case "table": {
      return tableToTextRows(token).join("\n");
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

function listItemToPlainText(
  item: Tokens.ListItem,
  ordered: boolean,
  start: number | "",
  index: number,
  listDepth: number
): string {
  const indent = listIndent(listDepth);
  const marker = listMarker(ordered, start, index);
  const prefix = indent + marker;
  return `${prefix}${markdownTokensToPlainText(item.tokens, listDepth + 1)}`;
}

function tableToTextRows(table: Tokens.Table): string[] {
  const rows = [table.header, ...table.rows];

  return rows.map((row) => {
    const cells = row.map((cell) => tableCellToPlainText(cell));
    return `| ${cells.join(" | ")} |`;
  });
}

function tableCellToPlainText(cell: MarkdownTableCell): string {
  return markdownTokensToPlainText(cell.tokens);
}

function markdownTokensToCommentBodyInlines(
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
        appendFormattedInlineChildren(inlines, token.tokens, {
          ...formatting,
          bold: true,
        });
        break;
      }

      case "em": {
        appendFormattedInlineChildren(inlines, token.tokens, {
          ...formatting,
          italic: true,
        });
        break;
      }

      case "del": {
        appendFormattedInlineChildren(inlines, token.tokens, {
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
        const text = markdownTokensToPlainText(token.tokens, 0);

        if (href === null) {
          appendTextWithMentions(inlines, text, formatting);
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
        const href = sanitizeUrl(token.href);
        const text = token.text || token.href;

        if (href === null) {
          appendTextWithMentions(inlines, text, formatting);
          break;
        }

        inlines.push(toCommentBodyText(token.text || href, formatting));
        break;
      }

      default: {
        const text = markdownTokenToPlainText(token, 0);
        if (text) {
          appendTextWithMentions(inlines, text, formatting);
        }
        break;
      }
    }
  }

  return inlines;
}

function markdownTokenToCommentBodyParagraphs(
  token: Token,
  listDepth = 0
): CommentBodyParagraph[] {
  switch (token.type) {
    case "space":
    case "hr": {
      return [];
    }

    case "paragraph":
    case "heading": {
      return [
        {
          type: "paragraph",
          children: markdownTokensToCommentBodyInlines(token.tokens),
        },
      ];
    }

    case "blockquote": {
      return markdownTokensToCommentBodyParagraphs(token.tokens, listDepth);
    }

    case "list": {
      const indent = listIndent(listDepth);
      return token.items.flatMap((item, index) => {
        const marker = listMarker(token.ordered, token.start, index);
        const prefix = indent + marker + taskListPrefix(item);
        const paragraphs = markdownTokensToCommentBodyParagraphs(
          item.tokens,
          listDepth + 1
        );

        if (paragraphs.length === 0) {
          return [
            {
              type: "paragraph",
              children: [{ text: prefix }],
            },
          ];
        }

        const [firstParagraph, ...remainingParagraphs] = paragraphs;

        if (!firstParagraph) {
          return [];
        }

        return [
          {
            ...firstParagraph,
            children: [{ text: prefix }, ...firstParagraph.children],
          },
          ...remainingParagraphs,
        ];
      });
    }

    case "list_item": {
      return markdownTokensToCommentBodyParagraphs(token.tokens, listDepth);
    }

    case "code": {
      return [
        {
          type: "paragraph",
          children: [{ text: token.text }],
        },
      ];
    }

    case "table": {
      return tableToTextRows(token).map((row) => ({
        type: "paragraph",
        children: [{ text: row }],
      }));
    }

    default: {
      const inlines = markdownTokensToCommentBodyInlines([token]);

      return inlines.length > 0
        ? [
            {
              type: "paragraph",
              children: inlines,
            },
          ]
        : [];
    }
  }
}

function markdownTokensToCommentBodyParagraphs(
  tokens: AnyToken[],
  listDepth = 0
): CommentBodyParagraph[] {
  assertTokens(tokens);
  return tokens.flatMap((token) =>
    markdownTokenToCommentBodyParagraphs(token, listDepth)
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
 * Convert a Markdown string into a `CommentBody`.
 *
 * Since `CommentBody` only supports paragraphs, text formatting, links, and mentions, it is a lossy conversion.
 */
export function markdownToCommentBody(markdown: string): CommentBody {
  return {
    version: 1,
    content: markdownTokensToCommentBodyParagraphs(
      parseMarkdownTokens(markdown),
      0
    ),
  };
}
