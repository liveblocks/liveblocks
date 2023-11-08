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

export type CommentBodyToPlainTextElements<
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

export type CommentBodyToPlainTextOptions<
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
  elements?: Partial<CommentBodyToPlainTextElements<TUserMeta>>;
};

const defaultCommentBodyToPlainTextElements: CommentBodyToPlainTextElements = {
  text: (element) => element.text,
  link: (element) => element.url,
  mention: (element, user) => {
    return `@${user?.name ?? element.id}`;
  },
};

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

/**
 * TODO: JSDoc
 */
export async function commentBodyToPlainText<
  TUserMeta extends BaseUserMeta = BaseUserMeta,
>(
  body: CommentBody,
  options?: CommentBodyToPlainTextOptions<TUserMeta>
): Promise<string> {
  const elements = {
    ...defaultCommentBodyToPlainTextElements,
    ...options?.elements,
  };
  const resolvedUsers = await resolveUsersInCommentBody(
    body,
    options?.resolveUsers
  );

  const blocks = body.content.map((block) => {
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
  });

  return blocks.join("\n");
}
