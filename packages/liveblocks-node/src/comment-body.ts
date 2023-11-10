import type {
  BaseUserMeta,
  CommentBody,
  CommentBodyBlockElement,
  CommentBodyElement,
  CommentBodyInlineElement,
  CommentBodyLink,
  CommentBodyMention,
  CommentBodyParagraph,
  CommentBodyText,
} from "@liveblocks/core";

import { isSomething } from "./utils";

type PromiseOrNot<T> = T | Promise<T>;

type CommentBodyResolveUsersArgs = {
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
   * TODO: JSDoc
   */
  user?: TUserMeta["info"];
};

export type StringifyCommentBodyElements<
  TUserMeta extends BaseUserMeta = BaseUserMeta,
> = {
  /**
   * TODO: JSDoc
   */
  paragraph: (args: CommentBodyParagraphElementArgs) => string;

  /**
   * TODO: JSDoc
   */
  text: (args: CommentBodyTextElementArgs) => string;

  /**
   * TODO: JSDoc
   */
  link: (args: CommentBodyLinkElementArgs) => string;

  /**
   * TODO: JSDoc
   */
  mention: (args: CommentBodyMentionElementArgs<TUserMeta>) => string;
};

export type StringifyCommentBodyOptions<
  TUserMeta extends BaseUserMeta = BaseUserMeta,
> = {
  /**
   * TODO: JSDoc
   */
  format?: "plain" | "html" | "markdown";

  /**
   * TODO: JSDoc
   */
  elements?: Partial<StringifyCommentBodyElements<TUserMeta>>;

  /**
   * TODO: JSDoc
   */
  separator?: string;

  /**
   * TODO: JSDoc
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
 * TODO: JSDoc
 */
export function getMentionIdsFromCommentBody(body: CommentBody): string[] {
  const mentionIds = new Set<string>();

  traverseCommentBody(body, "mention", (mention) => mentionIds.add(mention.id));

  return Array.from(mentionIds);
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

  const userIds = getMentionIdsFromCommentBody(body);
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

function toSingleLine(string: string) {
  if (!string.includes("\n")) {
    return string;
  }

  return string
    .split("\n")
    .map((line) => line.trim())
    .join("");
}

const htmlEntities = ["&", "<", ">", '"', "'", "/", "`", "="];

const markdownEntities = [
  "_",
  "*",
  "#",
  ".",
  "-",
  "+",
  "`",
  "!",
  "|",
  "(",
  ")",
  "{",
  "}",
  "[",
  "]",
];

function createEscapingTaggedTemplate(entities: string[]) {
  const entitiesRegex = new RegExp(
    Object.keys(entities)
      .map((entity) => `\\${entity}`)
      .join("|"),
    "g"
  );

  function escape(string?: string) {
    return string?.replace(entitiesRegex, (entity) => `\\${entity}`) ?? "";
  }

  return (strings: TemplateStringsArray, ...values: string[]) => {
    return toSingleLine(
      strings.reduce((result, str, i) => {
        const value = values[i - 1];
        const escapedValue = Array.isArray(value)
          ? value.join("")
          : escape(value);

        return result + escapedValue + str;
      })
    );
  };
}

/**
 * Build an HTML string from a template literal where the values
 * are escaped and newlines/identation are removed.
 *
 * Nested calls are supported and won't be escaped.
 */
const html = createEscapingTaggedTemplate(htmlEntities);

/**
 * Build a Markdown string from a template literal where the values
 * are escaped and newlines/identation are removed.
 *
 * Nested calls are supported and won't be escaped.
 */
const markdown = createEscapingTaggedTemplate(markdownEntities);

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
    return children ? html`<p>${children}</p>` : children;
  },
  text: ({ element }) => {
    // <code><s><em><strong>text</strong></s></em></code>
    let children = element.text;

    if (!children) {
      return children;
    }

    if (element.bold) {
      children = html`<strong>${children}</strong>`;
    }

    if (element.italic) {
      children = html`<em>${children}</em>`;
    }

    if (element.strikethrough) {
      children = html`<s>${children}</s>`;
    }

    if (element.code) {
      children = html`<code>${children}</code>`;
    }

    return children;
  },
  link: ({ element, href }) => {
    return html`<a href="${href}" target="_blank" rel="noopener noreferrer">
      ${element.url}
    </a>`;
  },
  mention: ({ element, user }) => {
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
      children = markdown`**${children}**`;
    }

    if (element.italic) {
      children = markdown`_${children}_`;
    }

    if (element.strikethrough) {
      children = markdown`~~${children}~~`;
    }

    if (element.code) {
      children = markdown`\`${children}\``;
    }

    return children;
  },
  link: ({ element, href }) => {
    return markdown`[${element.url}](${href})`;
  },
  mention: ({ element, user }) => {
    return markdown`@${user?.name ?? element.id}`;
  },
};

/**
 * TODO: JSDoc
 */
export async function stringifyCommentBody<
  TUserMeta extends BaseUserMeta = BaseUserMeta,
>(
  body: CommentBody,
  options?: StringifyCommentBodyOptions<TUserMeta>
): Promise<string> {
  const format = options?.format ?? "plain";
  const separator = options?.separator ?? format === "markdown" ? "\n\n" : "\n";
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

  const blocks = body.content.map((block) => {
    switch (block.type) {
      case "paragraph": {
        const paragraph = block.children
          .map((inline) => {
            if (isCommentBodyMention(inline)) {
              return inline.id
                ? elements.mention({
                    element: inline,
                    user: resolvedUsers.get(inline.id),
                  })
                : null;
            }

            if (isCommentBodyLink(inline)) {
              return elements.link({
                element: inline,
                href: toAbsoluteUrl(inline.url) ?? inline.url,
              });
            }

            if (isCommentBodyText(inline)) {
              return elements.text({ element: inline });
            }

            return null;
          })
          .filter(isSomething)
          .join("");

        return elements.paragraph({ element: block, children: paragraph });
      }

      default:
        return null;
    }
  });

  return blocks.filter(isSomething).join(separator);
}
