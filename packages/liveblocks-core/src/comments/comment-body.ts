import { nn } from "../lib/assert";
import type { BaseUserMeta } from "../protocol/BaseUserMeta";
import type {
  CommentBody,
  CommentBodyBlockElement,
  CommentBodyElement,
  CommentBodyInlineElement,
  CommentBodyLink,
  CommentBodyMention,
  CommentBodyParagraph,
  CommentBodyText,
} from "../types/CommentBody";

type PromiseOrNot<T> = T | Promise<T>;

export type CommentBodyResolveUsersArgs = {
  /**
   * The ID of the users to resolve.
   */
  userIds: string[];
};

type CommentBodyBlockElementName = Exclude<
  CommentBodyBlockElement,
  CommentBodyText
>["type"];

type CommentBodyInlineElementName =
  | Exclude<CommentBodyInlineElement, CommentBodyText>["type"]
  | "text";

type CommentBodyElementName =
  | CommentBodyBlockElementName
  | CommentBodyInlineElementName;

type CommentBodyBlockElements = {
  paragraph: CommentBodyParagraph;
};

type CommentBodyInlineElements = {
  text: CommentBodyText;
  link: CommentBodyLink;
  mention: CommentBodyMention;
};

type CommentBodyElements = CommentBodyBlockElements & CommentBodyInlineElements;

type CommentBodyVisitor<T extends CommentBodyElement = CommentBodyElement> = (
  element: T
) => void;

export type CommentBodyParagraphElementArgs = {
  /**
   * The paragraph element.
   */
  element: CommentBodyParagraph;

  /**
   * The text content of the paragraph.
   */
  children: string;
};

export type CommentBodyTextElementArgs = {
  /**
   * The text element.
   */
  element: CommentBodyText;
};

export type CommentBodyLinkElementArgs = {
  /**
   * The link element.
   */
  element: CommentBodyLink;

  /**
   * The absolute URL of the link.
   */
  href: string;
};

export type CommentBodyMentionElementArgs<
  TUserMeta extends BaseUserMeta = BaseUserMeta,
> = {
  /**
   * The mention element.
   */
  element: CommentBodyMention;

  /**
   * The mention's user info, if the `resolvedUsers` option was provided.
   */
  user?: TUserMeta["info"];
};

export type StringifyCommentBodyElements<
  TUserMeta extends BaseUserMeta = BaseUserMeta,
> = {
  /**
   * The element used to display paragraphs.
   */
  paragraph: (args: CommentBodyParagraphElementArgs, index: number) => string;

  /**
   * The element used to display text elements.
   */
  text: (args: CommentBodyTextElementArgs, index: number) => string;

  /**
   * The element used to display links.
   */
  link: (args: CommentBodyLinkElementArgs, index: number) => string;

  /**
   * The element used to display mentions.
   */
  mention: (
    args: CommentBodyMentionElementArgs<TUserMeta>,
    index: number
  ) => string;
};

export type StringifyCommentBodyOptions<
  TUserMeta extends BaseUserMeta = BaseUserMeta,
> = {
  /**
   * Which format to convert the comment to.
   */
  format?: "plain" | "html" | "markdown";

  /**
   * The elements used to customize the resulting string. Each element has
   * priority over the defaults inherited from the `format` option.
   */
  elements?: Partial<StringifyCommentBodyElements<TUserMeta>>;

  /**
   * The separator used between paragraphs.
   */
  separator?: string;

  /**
   * A function that returns user info from user IDs.
   */
  resolveUsers?: (
    args: CommentBodyResolveUsersArgs
  ) => PromiseOrNot<(TUserMeta["info"] | undefined)[] | undefined>;
};

function isCommentBodyParagraph(
  element: CommentBodyElement
): element is CommentBodyParagraph {
  return "type" in element && element.type === "mention";
}

function isCommentBodyText(
  element: CommentBodyElement
): element is CommentBodyText {
  return "text" in element && typeof element.text === "string";
}

function isCommentBodyMention(
  element: CommentBodyElement
): element is CommentBodyMention {
  return "type" in element && element.type === "mention";
}

function isCommentBodyLink(
  element: CommentBodyElement
): element is CommentBodyLink {
  return "type" in element && element.type === "link";
}

const commentBodyElementsGuards = {
  paragraph: isCommentBodyParagraph,
  text: isCommentBodyText,
  link: isCommentBodyLink,
  mention: isCommentBodyMention,
};

const commentBodyElementsTypes: Record<
  CommentBodyElementName,
  "block" | "inline"
> = {
  paragraph: "block",
  text: "inline",
  link: "inline",
  mention: "inline",
};

function traverseCommentBody(
  body: CommentBody,
  visitor: CommentBodyVisitor
): void;
function traverseCommentBody<T extends CommentBodyElementName>(
  body: CommentBody,
  element: T,
  visitor: CommentBodyVisitor<CommentBodyElements[T]>
): void;
function traverseCommentBody(
  body: CommentBody,
  elementOrVisitor: CommentBodyElementName | CommentBodyVisitor,
  possiblyVisitor?: CommentBodyVisitor
): void {
  if (!body || !body?.content) {
    return;
  }

  const element =
    typeof elementOrVisitor === "string" ? elementOrVisitor : undefined;
  const type = element ? commentBodyElementsTypes[element] : "all";
  const guard = element ? commentBodyElementsGuards[element] : () => true;
  const visitor =
    typeof elementOrVisitor === "function" ? elementOrVisitor : possiblyVisitor;

  for (const block of body.content) {
    if (type === "all" || type === "block") {
      if (guard(block)) {
        visitor?.(block);
      }
    }

    if (type === "all" || type === "inline") {
      for (const inline of block.children) {
        if (guard(inline)) {
          visitor?.(inline);
        }
      }
    }
  }
}

/**
 * Get an array of each user's ID that has been mentioned in a `CommentBody`.
 */
export function getMentionedIdsFromCommentBody(body: CommentBody): string[] {
  const mentionedIds = new Set<string>();

  traverseCommentBody(body, "mention", (mention) =>
    mentionedIds.add(mention.id)
  );

  return Array.from(mentionedIds);
}

async function resolveUsersInCommentBody<TUserMeta extends BaseUserMeta>(
  body: CommentBody,
  resolveUsers?: (
    args: CommentBodyResolveUsersArgs
  ) => PromiseOrNot<(TUserMeta["info"] | undefined)[] | undefined>
) {
  const resolvedUsers = new Map<string, TUserMeta["info"]>();

  if (!resolveUsers) {
    return resolvedUsers;
  }

  const userIds = getMentionedIdsFromCommentBody(body);
  const users = await resolveUsers({
    userIds,
  });

  for (const [index, userId] of userIds.entries()) {
    const user = users?.[index];

    if (user) {
      resolvedUsers.set(userId, user);
    }
  }

  return resolvedUsers;
}

const htmlEscapables = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const htmlEscapablesRegex = new RegExp(
  Object.keys(htmlEscapables)
    .map((entity) => `\\${entity}`)
    .join("|"),
  "g"
);

function htmlSafe(value: string) {
  return new HtmlSafeString([String(value)], []);
}

function joinHtml(strings: (string | HtmlSafeString)[]) {
  if (strings.length <= 0) {
    return new HtmlSafeString([""], []);
  }

  return new HtmlSafeString(
    ["", ...(Array(strings.length - 1).fill("") as string[]), ""],
    strings
  );
}

function escapeHtml(
  value: string | string[] | HtmlSafeString | HtmlSafeString[]
) {
  if (value instanceof HtmlSafeString) {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return joinHtml(value).toString();
  }

  return String(value).replace(
    htmlEscapablesRegex,
    (character) => htmlEscapables[character as keyof typeof htmlEscapables]
  );
}

// Adapted from https://github.com/Janpot/escape-html-template-tag
export class HtmlSafeString {
  private _strings: readonly string[];
  private _values: readonly (
    | string
    | string[]
    | HtmlSafeString
    | HtmlSafeString[]
  )[];

  constructor(
    strings: readonly string[],
    values: readonly (string | string[] | HtmlSafeString | HtmlSafeString[])[]
  ) {
    this._strings = strings;
    this._values = values;
  }

  toString(): string {
    return this._strings.reduce((result, str, i) => {
      return result + escapeHtml(nn(this._values[i - 1])) + str;
    });
  }
}

/**
 * Build an HTML string from a template literal where the values are escaped.
 * Nested calls are supported and won't be escaped.
 */
function html(
  strings: TemplateStringsArray,
  ...values: (string | string[] | HtmlSafeString | HtmlSafeString[])[]
) {
  return new HtmlSafeString(strings, values) as unknown as string;
}

const markdownEscapables = {
  _: "\\_",
  "*": "\\*",
  "#": "\\#",
  "`": "\\`",
  "~": "\\~",
  "!": "\\!",
  "|": "\\|",
  "(": "\\(",
  ")": "\\)",
  "{": "\\{",
  "}": "\\}",
  "[": "\\[",
  "]": "\\]",
};

const markdownEscapablesRegex = new RegExp(
  Object.keys(markdownEscapables)
    .map((entity) => `\\${entity}`)
    .join("|"),
  "g"
);

function joinMarkdown(strings: (string | MarkdownSafeString)[]) {
  if (strings.length <= 0) {
    return new MarkdownSafeString([""], []);
  }

  return new MarkdownSafeString(
    ["", ...(Array(strings.length - 1).fill("") as string[]), ""],
    strings
  );
}

function escapeMarkdown(
  value: string | string[] | MarkdownSafeString | MarkdownSafeString[]
) {
  if (value instanceof MarkdownSafeString) {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return joinMarkdown(value).toString();
  }

  return String(value).replace(
    markdownEscapablesRegex,
    (character) =>
      markdownEscapables[character as keyof typeof markdownEscapables]
  );
}

// Adapted from https://github.com/Janpot/escape-html-template-tag
export class MarkdownSafeString {
  private _strings: readonly string[];
  private _values: readonly (
    | string
    | string[]
    | MarkdownSafeString
    | MarkdownSafeString[]
  )[];

  constructor(
    strings: readonly string[],
    values: readonly (
      | string
      | string[]
      | MarkdownSafeString
      | MarkdownSafeString[]
    )[]
  ) {
    this._strings = strings;
    this._values = values;
  }

  toString(): string {
    return this._strings.reduce((result, str, i) => {
      return result + escapeMarkdown(nn(this._values[i - 1])) + str;
    });
  }
}

/**
 * Build a Markdown string from a template literal where the values are escaped.
 * Nested calls are supported and won't be escaped.
 */
function markdown(
  strings: TemplateStringsArray,
  ...values: (string | string[] | MarkdownSafeString | MarkdownSafeString[])[]
) {
  return new MarkdownSafeString(strings, values) as unknown as string;
}

/**
 * Helper function to convert a URL (relative or absolute) to an absolute URL.
 *
 * @param url The URL to convert to an absolute URL (relative or absolute).
 * @returns The absolute URL or undefined if the URL is invalid.
 */
function toAbsoluteUrl(url: string): string | undefined {
  // Check if the URL already contains a scheme
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  } else if (url.startsWith("www.")) {
    // If the URL starts with "www.", prepend "https://"
    return "https://" + url;
  }

  return;
}

const stringifyCommentBodyPlainElements: StringifyCommentBodyElements = {
  paragraph: ({ children }) => children,
  text: ({ element }) => element.text,
  link: ({ element }) => element.url,
  mention: ({ element, user }) => {
    return `@${user?.name ?? element.id}`;
  },
};

const stringifyCommentBodyHtmlElements: StringifyCommentBodyElements = {
  paragraph: ({ children }) => {
    // prettier-ignore
    return children ? html`<p>${htmlSafe(children)}</p>` : children;
  },
  text: ({ element }) => {
    // <code><s><em><strong>text</strong></s></em></code>
    let children = element.text;

    if (!children) {
      return children;
    }

    if (element.bold) {
      // prettier-ignore
      children = html`<strong>${children}</strong>`;
    }

    if (element.italic) {
      // prettier-ignore
      children = html`<em>${children}</em>`;
    }

    if (element.strikethrough) {
      // prettier-ignore
      children = html`<s>${children}</s>`;
    }

    if (element.code) {
      // prettier-ignore
      children = html`<code>${children}</code>`;
    }

    return children;
  },
  link: ({ element, href }) => {
    // prettier-ignore
    return html`<a href="${href}" target="_blank" rel="noopener noreferrer">${element.url}</a>`;
  },
  mention: ({ element, user }) => {
    // prettier-ignore
    return html`<span data-mention>@${user?.name ?? element.id}</span>`;
  },
};

const stringifyCommentBodyMarkdownElements: StringifyCommentBodyElements = {
  paragraph: ({ children }) => {
    return children;
  },
  text: ({ element }) => {
    // <code><s><em><strong>text</strong></s></em></code>
    let children = element.text;

    if (!children) {
      return children;
    }

    if (element.bold) {
      // prettier-ignore
      children = markdown`**${children}**`;
    }

    if (element.italic) {
      // prettier-ignore
      children = markdown`_${children}_`;
    }

    if (element.strikethrough) {
      // prettier-ignore
      children = markdown`~~${children}~~`;
    }

    if (element.code) {
      // prettier-ignore
      children = markdown`\`${children}\``;
    }

    return children;
  },
  link: ({ element, href }) => {
    // prettier-ignore
    return markdown`[${element.url}](${href})`;
  },
  mention: ({ element, user }) => {
    // prettier-ignore
    return markdown`@${user?.name ?? element.id}`;
  },
};

/**
 * Convert a `CommentBody` into either a plain string,
 * Markdown, HTML, or a custom format.
 */
export async function stringifyCommentBody<
  TUserMeta extends BaseUserMeta = BaseUserMeta,
>(
  body: CommentBody,
  options?: StringifyCommentBodyOptions<TUserMeta>
): Promise<string> {
  const format = options?.format ?? "plain";
  const separator =
    options?.separator ?? (format === "markdown" ? "\n\n" : "\n");
  const elements = {
    ...(format === "html"
      ? stringifyCommentBodyHtmlElements
      : format === "markdown"
      ? stringifyCommentBodyMarkdownElements
      : stringifyCommentBodyPlainElements),
    ...options?.elements,
  };
  const resolvedUsers = await resolveUsersInCommentBody(
    body,
    options?.resolveUsers
  );

  const blocks = body.content.flatMap((block, blockIndex) => {
    switch (block.type) {
      case "paragraph": {
        const inlines = block.children.flatMap((inline, inlineIndex) => {
          if (isCommentBodyMention(inline)) {
            return inline.id
              ? [
                  elements.mention(
                    {
                      element: inline,
                      user: resolvedUsers.get(inline.id),
                    },
                    inlineIndex
                  ),
                ]
              : [];
          }

          if (isCommentBodyLink(inline)) {
            return [
              elements.link(
                {
                  element: inline,
                  href: toAbsoluteUrl(inline.url) ?? inline.url,
                },
                inlineIndex
              ),
            ];
          }

          if (isCommentBodyText(inline)) {
            return [elements.text({ element: inline }, inlineIndex)];
          }

          return [];
        });

        return [
          elements.paragraph(
            { element: block, children: inlines.join("") },
            blockIndex
          ),
        ];
      }

      default:
        return [];
    }
  });

  return blocks.join(separator);
}
