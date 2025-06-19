/**
 * Liveblocks Text Editor
 *
 * Expose common types to transform nodes from different editors like `Lexical` or `TipTap`
 * and then convert them more easily as React or as html.
 */

import type {
  Awaitable,
  BaseGroupInfo,
  BaseUserMeta,
  Relax,
  ResolveGroupsInfoArgs,
  ResolveUsersArgs,
} from "@liveblocks/core";

import type {
  LexicalMentionNodeWithContext,
  SerializedLexicalNode,
  SerializedLexicalTextNode,
} from "./lexical-editor";
import { isSerializedMentionNode as isSerializedLexicalMentionNode } from "./lexical-editor";
import type {
  SerializedTiptapMark,
  SerializedTiptapMarkType,
  SerializedTiptapNode,
  SerializedTiptapTextNode,
  TiptapMentionNodeWithContext,
} from "./tiptap-editor";
import { isSerializedMentionNode as isSerializedTiptapMentionNode } from "./tiptap-editor";

type LiveblocksTextEditorTextFormat = {
  bold: boolean;
  italic: boolean;
  strikethrough: boolean;
  code: boolean;
};

export type LiveblocksTextEditorTextNode = {
  type: "text";
  text: string;
} & LiveblocksTextEditorTextFormat;

export type LiveblocksTextEditorMentionNode = Relax<
  LiveblocksTextEditorUserMentionNode | LiveblocksTextEditorGroupMentionNode
>;

type LiveblocksTextEditorUserMentionNode = {
  type: "mention";
  kind: "user";
  id: string;
};

export type LiveblocksTextEditorGroupMentionNode = {
  type: "mention";
  kind: "group";
  id: string;
  userIds?: string[];
};

/**
 * -------------------------------------------------------------------------------------------------
 * `LiveblocksTextEditorNode` is common structure to represents text editor nodes coming from
 * like `Lexical`, `TipTap` or so.
 *
 * This (simple) structure is made to be scalable and to accommodate with other text editors we could potentially
 * want to support in the future.
 *
 * It allows to manipulate nodes more easily and converts them with ease either as React nodes or as an html safe string.
 * From a DX standpoint it provides to developers the same structure to use when using custom React components or inline css
 * to represents a text mention with its surrounding text.
 * -------------------------------------------------------------------------------------------------
 */
export type LiveblocksTextEditorNode =
  | LiveblocksTextEditorTextNode
  | LiveblocksTextEditorMentionNode;

const baseLiveblocksTextEditorTextFormat: LiveblocksTextEditorTextFormat = {
  bold: false,
  italic: false,
  strikethrough: false,
  code: false,
};

/**
 * -------------------------------------------------------------------------------------------------
 * Lexical use bitwise operators to represent text formatting:
 * → https://github.com/facebook/lexical/blob/e423c6888dbf2dbd0b5ef68f781efadda20d34f3/packages/lexical/src/LexicalConstants.ts#L39
 *
 * It allows to combine multiple flags into one single integer such as:
 * 00000001  (bold)
 * 00000010  (italic)
 * --------
 * 0000011  (bold + italic)
 *
 * For now we're copying only the bitwise flags we need to provide a consistent DX with
 * `ThreadNotificationEvent` comments:
 *  - BOLD
 *  - ITALIC
 *  - STRIKETHROUGH
 *  - CODE
 *
 * and `transformLexicalTextNodeFormatBitwiseInteger` transforms these flags
 * into a object of booleans `LiveblocksTextEditorTextFormat`:
 * ```ts
 * {
 *  bold: boolean;
 *  italic: boolean;
 *  strikethrough: boolean;
 *  code: boolean;
 * }
 * ```
 * -------------------------------------------------------------------------------------------------
 */

const IS_LEXICAL_BOLD = 1;
const IS_LEXICAL_ITALIC = 1 << 1;
const IS_LEXICAL_STRIKETHROUGH = 1 << 2;
const IS_LEXICAL_CODE = 1 << 4;

/** @internal */
const transformLexicalTextNodeFormatBitwiseInteger = (
  node: SerializedLexicalTextNode
): LiveblocksTextEditorTextFormat => {
  const attributes = node.attributes;

  if ("__format" in attributes && typeof attributes.__format === "number") {
    const format = attributes.__format;
    return {
      bold: (format & IS_LEXICAL_BOLD) !== 0,
      italic: (format & IS_LEXICAL_ITALIC) !== 0,
      strikethrough: (format & IS_LEXICAL_STRIKETHROUGH) !== 0,
      code: (format & IS_LEXICAL_CODE) !== 0,
    };
  }

  return baseLiveblocksTextEditorTextFormat;
};

/**
 * @internal
 *
 * Transform Lexical serialized nodes
 * as Liveblocks Text Editor nodes
 */
const transformLexicalMentionNodeWithContext = (
  mentionNodeWithContext: LexicalMentionNodeWithContext
): LiveblocksTextEditorNode[] => {
  const textEditorNodes: LiveblocksTextEditorNode[] = [];
  const { before, after, mention } = mentionNodeWithContext;

  const transform = (nodes: SerializedLexicalNode[]) => {
    for (const node of nodes) {
      if (node.group === "text") {
        const format = transformLexicalTextNodeFormatBitwiseInteger(node);
        textEditorNodes.push({
          type: "text",
          text: node.text,
          ...format,
        });
      } else if (
        node.group === "decorator" &&
        isSerializedLexicalMentionNode(node)
      ) {
        textEditorNodes.push({
          type: "mention",
          kind: "user",
          id: node.attributes.__userId,
        });
      }
    }
  };

  transform(before);
  textEditorNodes.push({
    type: "mention",
    kind: "user",
    id: mention.attributes.__userId,
  });
  transform(after);

  return textEditorNodes;
};

/** @internal */
const hasTiptapSerializedTextNodeMark = (
  marks: Array<SerializedTiptapMark>,
  type: SerializedTiptapMarkType
): boolean => marks.findIndex((mark) => mark.type === type) !== -1;

/** @internal */
const transformTiptapTextNodeFormatMarks = (
  node: SerializedTiptapTextNode
): LiveblocksTextEditorTextFormat => {
  if (!node.marks) {
    return baseLiveblocksTextEditorTextFormat;
  }

  const marks = node.marks;
  return {
    bold: hasTiptapSerializedTextNodeMark(marks, "bold"),
    italic: hasTiptapSerializedTextNodeMark(marks, "italic"),
    strikethrough: hasTiptapSerializedTextNodeMark(marks, "strike"),
    code: hasTiptapSerializedTextNodeMark(marks, "code"),
  };
};

/**
 *
 * @internal
 *
 * Transform Tiptap serialized nodes
 * as Liveblocks Text Editor nodes
 */
const transformTiptapMentionNodeWithContext = (
  mentionNodeWithContext: TiptapMentionNodeWithContext
): LiveblocksTextEditorNode[] => {
  const textEditorNodes: LiveblocksTextEditorNode[] = [];
  const { before, after, mention } = mentionNodeWithContext;

  const transform = (nodes: SerializedTiptapNode[]) => {
    for (const node of nodes) {
      if (node.type === "text") {
        const format = transformTiptapTextNodeFormatMarks(node);
        textEditorNodes.push({
          type: "text",
          text: node.text,
          ...format,
        });
      } else if (isSerializedTiptapMentionNode(node)) {
        textEditorNodes.push({
          type: "mention",
          kind: "user",
          id: node.attrs.id,
        });
      }
    }
  };

  transform(before);
  textEditorNodes.push({
    type: "mention",
    kind: "user",
    id: mention.attrs.id,
  });
  transform(after);

  return textEditorNodes;
};

type TransformableMentionNodeWithContext =
  | {
      editor: "lexical";
      mention: LexicalMentionNodeWithContext;
    }
  | {
      editor: "tiptap";
      mention: TiptapMentionNodeWithContext;
    };

/**
 * @internal
 *
 * Transforms either Lexical or TipTap nodes into a common structure
 * of Liveblocks Text Editor nodes to ease conversion into
 * React Nodes or html safe strings
 */
export function transformAsLiveblocksTextEditorNodes(
  transformableMention: TransformableMentionNodeWithContext
): LiveblocksTextEditorNode[] {
  switch (transformableMention.editor) {
    case "lexical": {
      return transformLexicalMentionNodeWithContext(
        transformableMention.mention
      );
    }
    case "tiptap": {
      return transformTiptapMentionNodeWithContext(
        transformableMention.mention
      );
    }
  }
}

/**
 * @internal
 * Resolves mentioned users in Liveblocks Text Editor nodes.
 */
export const resolveUsersInLiveblocksTextEditorNodes = async <
  U extends BaseUserMeta,
>(
  nodes: LiveblocksTextEditorNode[],
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => Awaitable<(U["info"] | undefined)[] | undefined>
): Promise<Map<string, U["info"]>> => {
  const resolvedUsers = new Map<string, U["info"]>();
  if (!resolveUsers) {
    return resolvedUsers;
  }

  const mentionedUserIds = new Set<string>();
  for (const node of nodes) {
    if (node.type === "mention" && node.kind === "user") {
      mentionedUserIds.add(node.id);
    }
  }

  const userIds = Array.from(mentionedUserIds);

  const users = await resolveUsers({ userIds });
  if (users) {
    for (const [index, userId] of userIds.entries()) {
      const user = users[index];
      if (user) {
        resolvedUsers.set(userId, user);
      }
    }
  }
  return resolvedUsers;
};

/**
 * @internal
 * Resolves mentioned groups in Liveblocks Text Editor nodes.
 */
export const resolveGroupsInfoInLiveblocksTextEditorNodes = async <
  GI extends BaseGroupInfo,
>(
  nodes: LiveblocksTextEditorNode[],
  resolveGroupsInfo?: (
    args: ResolveGroupsInfoArgs
  ) => Awaitable<(GI | undefined)[] | undefined>
): Promise<Map<string, GI>> => {
  const resolvedGroupsInfo = new Map<string, GI>();
  if (!resolveGroupsInfo) {
    return resolvedGroupsInfo;
  }

  const mentionedGroupIds = new Set<string>();
  for (const node of nodes) {
    if (node.type === "mention" && node.kind === "group") {
      mentionedGroupIds.add(node.id);
    }
  }

  const groupIds = Array.from(mentionedGroupIds);

  const groupsInfo = await resolveGroupsInfo({ groupIds });
  if (groupsInfo) {
    for (const [index, groupId] of groupIds.entries()) {
      const groupInfo = groupsInfo[index];
      if (groupInfo) {
        resolvedGroupsInfo.set(groupId, groupInfo);
      }
    }
  }
  return resolvedGroupsInfo;
};
