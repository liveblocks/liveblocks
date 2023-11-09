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

export type CommentBodyToStringElements<
  TUserMeta extends BaseUserMeta = BaseUserMeta,
> = {
  /**
   * TODO: JSDoc
   */
  text: (element: CommentBodyText) => string;

  /**
   * TODO: JSDoc
   */
  link: (element: CommentBodyLink) => string;

  /**
   * TODO: JSDoc
   */
  mention: (element: CommentBodyMention, user?: TUserMeta["info"]) => string;
};

export type CommentBodyToStringOptions<
  TUserMeta extends BaseUserMeta = BaseUserMeta,
> = {
  /**
   * TODO: JSDoc
   */
  resolveUsers?: (
    args: CommentBodyResolveUsersArgs
  ) => PromiseOrNot<(TUserMeta["info"] | undefined)[] | undefined>;

  /**
   * TODO: JSDoc
   */
  elements?: Partial<CommentBodyToStringElements<TUserMeta>>;
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

const defaultCommentBodyToPlainTextElements: CommentBodyToStringElements = {
  text: (element) => element.text,
  link: (element) => element.url,
  mention: (element, user) => {
    return `@${user?.name ?? element.id}`;
  },
};

/**
 * TODO: JSDoc
 */
export async function commentBodyToPlainText<
  TUserMeta extends BaseUserMeta = BaseUserMeta,
>(
  body: CommentBody,
  options?: CommentBodyToStringOptions<TUserMeta>
): Promise<string> {
  const elements = {
    ...defaultCommentBodyToPlainTextElements,
    ...options?.elements,
  };
  const resolvedUsers = await resolveUsersInCommentBody(
    body,
    options?.resolveUsers
  );

  if (!body || !body?.content) {
    return "";
  }

  const blocks = body.content.map((block) => {
    switch (block.type) {
      case "paragraph": {
        const children = block.children
          .map((inline) => {
            if (isCommentBodyMention(inline)) {
              return elements.mention(inline, resolvedUsers.get(inline.id));
            }

            if (isCommentBodyLink(inline)) {
              return elements.link(inline);
            }

            if (isCommentBodyText(inline)) {
              return elements.text(inline);
            }

            return null;
          })
          .filter(isSomething)
          .join("");

        return children;
      }

      default:
        return null;
    }
  });

  return blocks.filter(isSomething).join("\n");
}

// Tagged template literal used to hint to external tooling
// (Prettier, editors' syntax highlighting, etc) that the string is HTML.
const html = String.raw;

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

const defaultCommentBodyToHtmlElements: CommentBodyToStringElements = {
  text: (element) => {
    // <code><s><em><strong>text</strong></s></em></code>
    let children = element.text;

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

    return html`<span>${children}</span>`;
  },
  link: (element) => {
    const href = toAbsoluteUrl(element.url) ?? element.url;

    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${element.url}</a>`;
  },
  mention: (element, user) => {
    return html`<span>@${user?.name ?? element.id}</span>`;
  },
};

/**
 * TODO: JSDoc
 */
export async function commentBodyToHtml<
  TUserMeta extends BaseUserMeta = BaseUserMeta,
>(
  body: CommentBody,
  options?: CommentBodyToStringOptions<TUserMeta>
): Promise<string> {
  const elements = {
    ...defaultCommentBodyToHtmlElements,
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
                ? elements.mention(inline, resolvedUsers.get(inline.id))
                : null;
            }

            if (isCommentBodyLink(inline)) {
              return elements.link(inline);
            }

            if (isCommentBodyText(inline)) {
              return elements.text(inline);
            }

            return null;
          })
          .filter(isSomething)
          .join("");

        return html`<p>${paragraph}</p>`;
      }

      default:
        return null;
    }
  });

  return blocks.filter(isSomething).join("\n");
}
