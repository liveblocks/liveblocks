import { assertNever, isUrl, type Relax, sanitizeUrl } from "@liveblocks/core";
import { Slot } from "@radix-ui/react-slot";
import {
  Lexer,
  type MarkedToken as DefaultMarkedToken,
  type Token,
  type Tokens,
} from "marked";
import {
  type ComponentType,
  forwardRef,
  memo,
  type ReactNode,
  useMemo,
  useSyncExternalStore,
} from "react";

import type { ComponentPropsWithSlot } from "../types";

const LIST_ITEM_CHECKBOX_REGEX = /^\[\s?(x)?\]?$/i;
const PARTIAL_LINK_IMAGE_REGEX =
  /(?<!\\)(?<image>!)?\[(?!\^)(?<text>[^\]]*)(?:\](?:\((?<url>[^)]*)?)?)?$/;
const PARTIAL_TABLE_HEADER_REGEX =
  /^\s*\|(?:[^|\n]+(?:\|[^|\n]+)*?)?\|?\s*(?:\n\s*\|\s*[-:|\s]*\s*)?$/;
const PARTIAL_EMOJI_REGEX =
  /(?:[\uD800-\uDBFF]|\u200D|\uFE0F|\u20E3|\p{Regional_Indicator}|\p{Emoji_Presentation}|\p{Emoji_Modifier_Base}|\p{Emoji_Modifier})+$/u;
const TRAILING_NON_WHITESPACE_REGEX = /^\S*/;
const WHITESPACE_REGEX = /\s/;
const NEWLINE_REGEX = /\r\n?/g;
const BUFFERED_CHARACTERS_REGEX =
  /(?<!\\)((\*+|_+|~+|`+|\++|-{0,2}|={0,2}|\\|!|<\/?)\s*)$/;
const SINGLE_CHARACTER_REGEX = /^\s*(\S\s*)$/;

const FORMATTING_DELIMITERS = ["**", "__", "~~", "*", "_", "`"];
const DEFAULT_PARTIAL_LINK_URL = "#";

type CheckboxToken = {
  type: "checkbox";
  checked: boolean;
};

type MarkedToken = DefaultMarkedToken | CheckboxToken;

type PotentiallyPartialToken = Relax<
  | Tokens.Text
  | Tokens.Paragraph
  | Tokens.Heading
  | Tokens.Blockquote
  | Tokens.ListItem
  | Tokens.TableCell
  | Tokens.Code
>;

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
   *     List: ({ type, items, start }) => {
   *       const List = type === "ordered" ? "ol" : "ul";
   *       return (
   *         <List start={start}>
   *           {items.map((item, index) => (
   *             <li key={index}>
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

export type MarkdownComponentsListProps = Relax<
  MarkdownComponentsOrderedListProps | MarkdownComponentsUnorderedListProps
>;

interface MarkdownComponentsOrderedListProps {
  type: "ordered";
  items: MarkdownComponentsListItem[];
  start: number;
}

interface MarkdownComponentsUnorderedListProps {
  type: "unordered";
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
  partial?: boolean;
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
  List: ({ type, items, start }) => {
    const List = type === "ordered" ? "ol" : "ul";

    return (
      <List start={start === 1 ? undefined : start}>
        {items.map((item, index) => (
          <li key={index}>{item.children}</li>
        ))}
      </List>
    );
  },
  Separator: () => {
    return <hr />;
  },
};

const isMountedSubscribe = () => () => {};
const isMountedGetSnapshot = () => true;
const isMountedGetServerSnapshot = () => false;

export const Markdown = forwardRef<HTMLDivElement, MarkdownProps>(
  ({ content, partial, components, asChild, ...props }, forwardedRef) => {
    const Component = asChild ? Slot : "div";
    const tokens = useMemo(() => {
      if (!partial) {
        return getMarkedTokens(content);
      }

      const preprocessedContent = trimPartialMarkdown(
        normalizeNewlines(content)
      );

      const tokens = getMarkedTokens(preprocessedContent);

      try {
        return completePartialTokens(tokens);
      } catch {
        return tokens;
      }
    }, [content, partial]);
    const isMounted = useSyncExternalStore(
      isMountedSubscribe,
      isMountedGetSnapshot,
      isMountedGetServerSnapshot
    );

    return (
      <Component {...props} ref={forwardedRef}>
        {tokens.map((token, index) => {
          return (
            <MemoizedMarkdownToken
              token={token}
              key={index}
              components={components}
              partial={partial}
              isMounted={isMounted}
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
    isMounted,
  }: {
    token: Token;
    components?: Partial<MarkdownComponents>;
    partial?: boolean;
    isMounted: boolean;
  }) => {
    return (
      <MarkdownToken
        token={token}
        components={components}
        isMounted={isMounted}
      />
    );
  },
  (previousProps, nextProps) => {
    const previousToken = previousProps.token;
    const nextToken = nextProps.token;

    // 1️⃣ Start with the fastest comparisons
    if (
      previousToken.type !== nextToken.type ||
      previousProps.partial !== nextProps.partial ||
      previousProps.isMounted !== nextProps.isMounted
    ) {
      return false;
    }

    let previousContent = previousToken.raw;
    let nextContent = nextToken.raw;

    if ("text" in previousToken && "text" in nextToken) {
      previousContent = (previousToken as Extract<Token, { text: string }>)
        .text;
      nextContent = (nextToken as Extract<Token, { text: string }>).text;
    }

    // 2️⃣ Then only compare the tokens' content lengths first
    if (previousContent.length !== nextContent.length) {
      return false;
    }

    // 3️⃣ And finally compare the actual tokens' content
    return previousContent === nextContent;
  }
);

export function MarkdownToken({
  token,
  components,
  isMounted,
}: {
  token: Token;
  components: Partial<MarkdownComponents> | undefined;
  isMounted: boolean;
}) {
  // Marked.js supports generic tokens in their types but we
  // don't use them.
  const markedToken = token as unknown as MarkedToken;

  switch (markedToken.type) {
    case "escape": {
      return markedToken.text;
    }

    case "space": {
      return null;
    }

    case "text": {
      if (markedToken.tokens !== undefined) {
        return (
          <MarkdownTokens
            tokens={markedToken.tokens}
            components={components}
            isMounted={isMounted}
          />
        );
      } else {
        return parseHtmlEntities(markedToken.text, isMounted);
      }
    }

    case "br": {
      return <br />;
    }

    case "paragraph": {
      const Paragraph = components?.Paragraph ?? defaultComponents.Paragraph;

      return (
        <Paragraph>
          <MarkdownTokens
            tokens={markedToken.tokens}
            components={components}
            isMounted={isMounted}
          />
        </Paragraph>
      );
    }

    case "heading": {
      const Heading = components?.Heading ?? defaultComponents.Heading;

      return (
        <Heading level={clampHeadingLevel(markedToken.depth)}>
          <MarkdownTokens
            tokens={markedToken.tokens}
            components={components}
            isMounted={isMounted}
          />
        </Heading>
      );
    }

    case "strong": {
      const Inline = components?.Inline ?? defaultComponents.Inline;

      return (
        <Inline type="strong">
          <MarkdownTokens
            tokens={markedToken.tokens}
            components={components}
            isMounted={isMounted}
          />
        </Inline>
      );
    }

    case "em": {
      const Inline = components?.Inline ?? defaultComponents.Inline;

      return (
        <Inline type="em">
          <MarkdownTokens
            tokens={markedToken.tokens}
            components={components}
            isMounted={isMounted}
          />
        </Inline>
      );
    }

    case "codespan": {
      const Inline = components?.Inline ?? defaultComponents.Inline;

      return (
        <Inline type="code">
          {parseHtmlEntities(markedToken.text, isMounted)}
        </Inline>
      );
    }

    case "del": {
      const Inline = components?.Inline ?? defaultComponents.Inline;

      return (
        <Inline type="del">
          <MarkdownTokens
            tokens={markedToken.tokens}
            components={components}
            isMounted={isMounted}
          />
        </Inline>
      );
    }

    case "link": {
      const href = sanitizeUrl(markedToken.href);

      if (href === null) {
        return (
          <MarkdownTokens
            tokens={markedToken.tokens}
            components={components}
            isMounted={isMounted}
          />
        );
      }

      const Link = components?.Link ?? defaultComponents.Link;

      return (
        <Link href={href} title={markedToken.title ?? undefined}>
          <MarkdownTokens
            tokens={markedToken.tokens}
            components={components}
            isMounted={isMounted}
          />
        </Link>
      );
    }

    case "code": {
      let language: string | undefined = undefined;
      if (markedToken.lang !== undefined) {
        language =
          markedToken.lang.match(TRAILING_NON_WHITESPACE_REGEX)?.[0] ??
          undefined;
      }

      const CodeBlock = components?.CodeBlock ?? defaultComponents.CodeBlock;

      return <CodeBlock language={language} code={markedToken.text || " "} />;
    }

    case "blockquote": {
      const Blockquote = components?.Blockquote ?? defaultComponents.Blockquote;

      return (
        <Blockquote>
          <MarkdownTokens
            tokens={markedToken.tokens}
            components={components}
            isMounted={isMounted}
            normalizeToBlockTokens
          />
        </Blockquote>
      );
    }

    case "list": {
      const List = components?.List ?? defaultComponents.List;
      const items: MarkdownComponentsListItem[] = markedToken.items.map(
        (item) => {
          let tokens = item.tokens as MarkedToken[];

          if (item.task) {
            tokens = [
              { type: "checkbox", checked: Boolean(item.checked) },
              ...tokens,
            ];
          }

          return {
            checked: item.task ? item.checked : undefined,
            children: (
              <MarkdownTokens
                tokens={tokens as Token[]}
                components={components}
                isMounted={isMounted}
                // A "loose" list item in Markdown is one where the content is wrapped in a paragraph (or potentially other block) token
                normalizeToBlockTokens={
                  item.tokens.length > 0 ? item.loose : false
                }
              />
            ),
          };
        }
      );

      const props: MarkdownComponentsListProps = markedToken.ordered
        ? { type: "ordered", items, start: markedToken.start || 1 }
        : { type: "unordered", items };

      return <List {...props} />;
    }

    case "checkbox": {
      return (
        <>
          <input type="checkbox" disabled checked={markedToken.checked} />{" "}
        </>
      );
    }

    case "table": {
      const Table = components?.Table ?? defaultComponents.Table;
      const headings: MarkdownComponentsTableCell[] = markedToken.header.map(
        (cell) => ({
          align: cell.align ?? undefined,
          children: (
            <MarkdownTokens
              tokens={cell.tokens}
              components={components}
              isMounted={isMounted}
            />
          ),
        })
      );

      const rows: MarkdownComponentsTableCell[][] = markedToken.rows.map(
        (row) =>
          row.map((cell) => ({
            align: cell.align ?? undefined,
            children: (
              <MarkdownTokens
                tokens={cell.tokens}
                components={components}
                isMounted={isMounted}
              />
            ),
          }))
      );

      return <Table headings={headings} rows={rows} />;
    }

    case "image": {
      const href = sanitizeUrl(markedToken.href);

      if (href === null) {
        return markedToken.text;
      }

      const Image = components?.Image ?? defaultComponents.Image;

      return (
        <Image
          src={href}
          alt={markedToken.text}
          title={markedToken.title ?? undefined}
        />
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
  isMounted,
}: {
  tokens: Token[];
  components: Partial<MarkdownComponents> | undefined;
  isMounted: boolean;
  normalizeToBlockTokens?: boolean;
}) {
  const markedTokens = tokens as MarkedToken[];
  let normalizedTokens: MarkedToken[] = [];

  if (normalizeToBlockTokens) {
    let leadingCheckboxToken =
      markedTokens[0]?.type === "checkbox" ? markedTokens[0] : null;

    for (let i = 0; i < markedTokens.length; i++) {
      const token = markedTokens[i]!;

      switch (token.type) {
        case "text": {
          // Wrap consecutive text tokens into a paragraph
          const paragraphTextTokens: Tokens.Text[] = [token];
          while (
            i + 1 < markedTokens.length &&
            markedTokens[i + 1]!.type === "text"
          ) {
            i++;
            paragraphTextTokens.push(markedTokens[i] as Tokens.Text);
          }

          const paragraphRaw = paragraphTextTokens
            .map((text) => text.raw)
            .join("");
          const paragraphText = paragraphTextTokens
            .map((text) => text.text)
            .join("");

          // When wrapping "loose" task list items into paragraphs, we need to
          // move the checkbox into the first paragraph.
          normalizedTokens.push({
            type: "paragraph",
            tokens: leadingCheckboxToken
              ? ([leadingCheckboxToken, ...paragraphTextTokens] as Token[])
              : paragraphTextTokens,
            raw: paragraphRaw,
            text: paragraphText,
          } satisfies Tokens.Paragraph);
          leadingCheckboxToken = null;

          break;
        }

        case "checkbox":
          break;

        default: {
          normalizedTokens.push(token);
        }
      }
    }
  } else {
    normalizedTokens = markedTokens;
  }

  return normalizedTokens.map((token, index) => (
    <MarkdownToken
      key={index}
      token={token as Token}
      components={components}
      isMounted={isMounted}
    />
  ));
}

function getMarkedTokens(content: string) {
  return new Lexer().lex(content);
}

function isBlockToken(
  token: Token
): token is
  | Tokens.Paragraph
  | Tokens.Heading
  | Tokens.Blockquote
  | Tokens.ListItem {
  return (
    token.type === "paragraph" ||
    token.type === "heading" ||
    token.type === "blockquote" ||
    token.type === "list_item"
  );
}

/**
 * Find the last partial token that we could potentially complete.
 */
function findPotentiallyPartialToken(
  tokens: Token[],
  parentToken?: PotentiallyPartialToken
): PotentiallyPartialToken | undefined {
  if (tokens.length === 0) {
    return parentToken;
  }

  const lastIndex = tokens.length - 1;
  let lastToken = tokens[lastIndex]!;

  if (lastToken.type === "space") {
    const penultimateToken = tokens[lastIndex - 1];

    if (!penultimateToken) {
      return parentToken;
    }

    lastToken = penultimateToken;
  }

  if (lastToken.type === "list") {
    const listToken = lastToken as Tokens.List;
    const lastListItem = listToken.items[listToken.items.length - 1];

    if (!lastListItem) {
      return parentToken;
    }

    // List items containing empty lines are handled differently,
    // instead of using the list item's tokens, we use the last one
    // if it's a text or block token.
    if (
      lastListItem.tokens.some((token) => token.type === "space") &&
      lastListItem.tokens.length > 0
    ) {
      const lastListItemLastToken =
        lastListItem.tokens[lastListItem.tokens.length - 1];

      if (lastListItemLastToken) {
        if (lastListItemLastToken.type === "text") {
          return lastListItemLastToken as Tokens.Text;
        }

        if (isBlockToken(lastListItemLastToken)) {
          return findPotentiallyPartialToken(
            lastListItemLastToken.tokens,
            lastListItemLastToken
          );
        }

        return undefined;
      }
    }

    return findPotentiallyPartialToken(lastListItem.tokens, lastListItem);
  }

  if (lastToken.type === "table") {
    const tableToken = lastToken as Tokens.Table;
    const lastTableRow = tableToken.rows[tableToken.rows.length - 1];

    if (!lastTableRow) {
      return parentToken;
    }

    // Marked.js creates all cells in advance when creating rows,
    // we want the cell where the end currently is.
    const firstEmptyTableCellIndex = lastTableRow.findIndex(
      (cell) => cell.tokens.length === 0
    );
    const lastNonEmptyTableCell =
      firstEmptyTableCellIndex === -1
        ? undefined
        : firstEmptyTableCellIndex === 0
          ? lastTableRow[firstEmptyTableCellIndex]
          : lastTableRow[firstEmptyTableCellIndex - 1];

    if (!lastNonEmptyTableCell) {
      return parentToken;
    }

    return findPotentiallyPartialToken(
      lastNonEmptyTableCell.tokens,
      lastNonEmptyTableCell
    );
  }

  if (isBlockToken(lastToken)) {
    return findPotentiallyPartialToken(lastToken.tokens, lastToken);
  }

  return parentToken;
}

function normalizeNewlines(string: string) {
  return string.replace(NEWLINE_REGEX, "\n");
}

/**
 * Trim a partial Markdown string to avoid incomplete tokens.
 */
function trimPartialMarkdown(markdown: string) {
  const lines = markdown.split("\n");

  if (lines.length === 0) {
    return markdown;
  }

  // If the last line contains a single non-whitespace character,
  // we can remove it for now.
  const [singleCharacterMatch] =
    lines[lines.length - 1]!.match(SINGLE_CHARACTER_REGEX) ?? [];

  if (singleCharacterMatch) {
    lines[lines.length - 1] = lines[lines.length - 1]!.slice(
      0,
      -singleCharacterMatch.length
    );

    return lines.join("\n");
  }

  // If the last line ends with partial syntax, we can remove it for now.
  const [bufferedCharactersMatch] =
    lines[lines.length - 1]!.match(BUFFERED_CHARACTERS_REGEX) ?? [];

  if (bufferedCharactersMatch) {
    lines[lines.length - 1] = lines[lines.length - 1]!.slice(
      0,
      -bufferedCharactersMatch.length
    );

    return lines.join("\n");
  }

  return markdown;
}

/**
 * Optimistically complete a Markdown string of inline content:
 *
 * - Bold, italic, strikethrough, and inline code
 * - Links
 *
 * Remove any remaining partial content:
 *
 * - Emoji
 */
function completePartialInlineMarkdown(
  markdown: string,
  options: { allowLinksImages?: boolean } = {}
): string {
  const stack: { string: string; length: number; index: number }[] = [];
  const allowLinksImages = options.allowLinksImages ?? true;
  let completedMarkdown = markdown;

  // Trim any partial emoji.
  //
  // We do this here rather than in `trimPartialMarkdown` because
  // `trimPartialMarkdown` needs to run before Marked.js to prevent
  // it from parsing partial Markdown syntax, emojis won't be parsed
  // by Marked.js so we can trim them here to be a bit more efficient.
  const partialEmojiMatch = completedMarkdown.match(PARTIAL_EMOJI_REGEX);

  if (partialEmojiMatch) {
    completedMarkdown = completedMarkdown.slice(
      0,
      -partialEmojiMatch[0].length
    );
  }

  // Move forward through the string to collect delimiters.
  for (let i = 0; i < completedMarkdown.length; i++) {
    let matchedDelimiter: string | null = null;

    for (const delimiter of FORMATTING_DELIMITERS) {
      if (
        markdown.startsWith(delimiter, i) &&
        (i > 0 ? markdown[i - 1] !== "\\" : true)
      ) {
        matchedDelimiter = delimiter;
        break;
      }
    }

    if (matchedDelimiter) {
      const lastDelimiter = stack[stack.length - 1];
      const isClosingPreviousDelimiter =
        lastDelimiter?.string === matchedDelimiter &&
        i > lastDelimiter.index + matchedDelimiter.length - 1;

      // If the delimiter is not closing any previous delimiter
      // and it's at the end of the string, we can remove it from the string.
      if (
        !isClosingPreviousDelimiter &&
        i + matchedDelimiter.length >= markdown.length
      ) {
        completedMarkdown = completedMarkdown.slice(0, i);
        break;
      }

      if (isClosingPreviousDelimiter) {
        // If the delimiter is closing a previous delimiter,
        // we remove it from the stack.
        stack.pop();
      } else {
        const characterAfterDelimiter =
          completedMarkdown[i + matchedDelimiter.length];

        // If the delimiter is opening and is followed by a
        // non-whitespace character, we add it to the stack.
        if (
          characterAfterDelimiter &&
          !WHITESPACE_REGEX.test(characterAfterDelimiter)
        ) {
          stack.push({
            string: matchedDelimiter,
            length: matchedDelimiter.length,
            index: i,
          });
        }
      }

      i += matchedDelimiter.length - 1;
    }
  }

  if (allowLinksImages) {
    const partialLinkImageMatch = completedMarkdown.match(
      PARTIAL_LINK_IMAGE_REGEX
    );

    if (partialLinkImageMatch) {
      const linkImageStartIndex = partialLinkImageMatch.index!;
      const linkImageEndIndex =
        linkImageStartIndex + partialLinkImageMatch[0].length;

      const isInsideInlineCodeBeforeLinkImage = stack.some(
        (delimiter) =>
          delimiter.string === "`" && delimiter.index < linkImageStartIndex
      );

      if (!isInsideInlineCodeBeforeLinkImage) {
        const partialLinkImageContent = partialLinkImageMatch[0];
        const {
          text: partialLinkText,
          url: partialLinkUrl,
          image: isImage,
        } = partialLinkImageMatch.groups!;

        if (isImage) {
          // We can't optimistically complete images, so we remove them until they are complete.
          completedMarkdown = completedMarkdown.slice(
            0,
            -partialLinkImageContent.length
          );
        } else {
          // We can remove delimiters from the stack that are inside the completed link,
          // since they are now closed.
          for (let i = stack.length - 1; i >= 0; i--) {
            const delimiter = stack[i]!;
            if (
              delimiter.index >= linkImageStartIndex &&
              delimiter.index < linkImageEndIndex
            ) {
              stack.splice(i, 1);
            }
          }

          const completedLinkText = partialLinkText
            ? partialLinkUrl
              ? // If there's a partial URL, the text is already completed.
                partialLinkText
              : // Otherwise, we complete the text and its potential nested elements.
                completePartialInlineMarkdown(partialLinkText, {
                  // Links/images cannot be nested.
                  allowLinksImages: false,
                })
            : "";
          const completedLinkUrl =
            partialLinkUrl &&
            !WHITESPACE_REGEX.test(partialLinkUrl) &&
            isUrl(partialLinkUrl)
              ? // We only use the partial URL if it's valid.
                partialLinkUrl
              : DEFAULT_PARTIAL_LINK_URL;
          const completedLink = `[${completedLinkText}](${completedLinkUrl})`;

          completedMarkdown = completedMarkdown.slice(
            0,
            -partialLinkImageContent.length
          );
          completedMarkdown += completedLink;
        }
      }
    }
  }

  // Move through the stack to close open formatting tokens.
  for (let i = stack.length - 1; i >= 0; i--) {
    const delimiter = stack[i]!;

    // If the open token is at the end of the string,
    // we can't close it yet so we remove it.
    if (delimiter.index + delimiter.length >= completedMarkdown.length) {
      completedMarkdown = completedMarkdown.slice(0, delimiter.index);
      continue;
    }

    // Bold, italic, and strikethrough cannot end with whitespace so
    // we trim their content before closing them.
    if (delimiter.string !== "`") {
      completedMarkdown = completedMarkdown.trimEnd();
    }

    // We can close that open token at this point.
    completedMarkdown += delimiter.string;
  }

  return completedMarkdown;
}

/**
 * Optimistically complete a Markdown string of a table.
 */
function completePartialTableMarkdown(markdown: string): string | undefined {
  const tableLines = markdown.split("\n");

  if (tableLines.length === 0) {
    return undefined;
  }

  const tableHeader = tableLines[0]!;

  if (tableHeader === "|") {
    return undefined;
  }

  const tableHeadings = tableHeader
    .split("|")
    .map((cell) => cell.trim())
    .filter((cell) => cell !== "");

  if (tableHeadings.length === 0) {
    return undefined;
  }

  // If the last header cell is partial, it might also contain partial elements.
  if (!tableHeader.endsWith("|")) {
    const lastTableHeading = tableHeadings[tableHeadings.length - 1]!;
    const completedLastTableHeading =
      completePartialInlineMarkdown(lastTableHeading);

    tableHeadings[tableHeadings.length - 1] = completedLastTableHeading;
  }

  return `| ${tableHeadings.join(" | ")} |\n| ${tableHeadings.map(() => "---").join(" | ")} |`;
}

function completePartialTokens(tokens: Token[]) {
  const potentiallyPartialToken = findPotentiallyPartialToken(tokens);

  if (!potentiallyPartialToken) {
    return tokens;
  }

  if (
    potentiallyPartialToken.type === "paragraph" ||
    potentiallyPartialToken.type === "text"
  ) {
    const text = potentiallyPartialToken as Tokens.Paragraph | Tokens.Text;

    // Marked.js only creates tables when the table header and its
    // separator below are complete.
    //
    // We optimistically create tables sooner if the current text looks
    // like a partial table header.
    if (PARTIAL_TABLE_HEADER_REGEX.test(text.raw)) {
      const completedTableMarkdown = completePartialTableMarkdown(text.raw);

      if (completedTableMarkdown) {
        // We optimistically complete the table as a string then re-lex it
        // to get an optimistically complete table token.
        const completedTable = getMarkedTokens(completedTableMarkdown)[0] as
          | Tokens.Table
          | undefined;

        if (completedTable) {
          // We replace the paragraph/text by the optimistically completed table.
          const table = text as unknown as Tokens.Table;

          table.type = "table";
          table.header = completedTable.header;
          table.align = completedTable.align;
          table.rows = completedTable.rows;

          return tokens;
        }
      } else {
        // Otherwise, we hide it for now.
        text.text = "";
        text.tokens = [];
      }
    }
  }

  if (potentiallyPartialToken.type === "list_item") {
    const listItem = potentiallyPartialToken as Tokens.ListItem;

    // Marked.js only turns list items into tasks when the list marker
    // and the task checkbox are complete and followed by a space. (e.g. "- [x] ")
    //
    // We optimistically mark list items as tasks sooner,
    // whenever a list item starts with "- [", "- [x", etc.
    if (
      !listItem.task &&
      listItem.tokens.length === 1 &&
      listItem.tokens[0]!.type === "text"
    ) {
      const listItemText = listItem.tokens[0] as Tokens.Text;
      const checkboxMatch = listItemText.text.match(LIST_ITEM_CHECKBOX_REGEX);

      if (checkboxMatch) {
        listItem.task = true;

        if (checkboxMatch[1] === "x") {
          listItem.checked = true;
        } else {
          listItem.checked = false;
        }

        listItem.text = "";
        listItem.tokens = [];
      }
    }
  }

  if (potentiallyPartialToken.text.length === 0) {
    return tokens;
  }

  // We optimistically complete inline content as a string then re-lex it
  // to get optimistically complete tokens.
  const completedMarkdown = completePartialInlineMarkdown(
    potentiallyPartialToken.text
  );
  const completedMarkdownTokens =
    (getMarkedTokens(completedMarkdown)[0] as Tokens.Paragraph | undefined)
      ?.tokens ?? [];

  potentiallyPartialToken.text = completedMarkdown;
  potentiallyPartialToken.tokens = completedMarkdownTokens;

  return tokens;
}

function parseHtmlEntities(input: string, isMounted: boolean) {
  // If the Markdown component is not mounted yet or DOMParser is not available
  // (it's a browser-only API), we don't parse HTML entities.
  if (!isMounted || typeof DOMParser === "undefined") {
    return input;
  }

  const document = new DOMParser().parseFromString(
    `<!doctype html><body>${input}`,
    "text/html"
  );

  return document.body.textContent;
}

function clampHeadingLevel(level: number) {
  return Math.max(1, Math.min(6, level)) as 1 | 2 | 3 | 4 | 5 | 6;
}
