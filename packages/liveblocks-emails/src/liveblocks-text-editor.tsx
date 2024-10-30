/**
 * Liveblocks Text Editor
 *
 * Expose common types to transform nodes from different editors like `Lexical` or `TipTap`
 * and then convert them more easily as React or as html.
 */

import type {
  BaseUserMeta,
  DU,
  OptionalPromise,
  ResolveUsersArgs,
} from "@liveblocks/core";
import React from "react";

import type {
  LexicalMentionNodeWithContext,
  SerializedLexicalNode,
  SerializedTextNode,
} from "./lexical-editor";
import { assertSerializedMentionNode } from "./lexical-editor";

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

export type LiveblocksTextEditorMentionNode = {
  type: "mention";
  userId: string;
};

export type LiveblocksTextEditorNode =
  | LiveblocksTextEditorTextNode
  | LiveblocksTextEditorMentionNode;

type TransformableMentionNodeWithContext =
  | {
      textEditorType: "lexical";
      mention: LexicalMentionNodeWithContext;
    }
  | {
      textEditorType: "tiptap";
      // TODO: add mention node with context for TipTap
    };

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

const transformLexicalTextNodeFormatBitwiseInteger = (
  node: SerializedTextNode
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
        assertSerializedMentionNode(node)
      ) {
        textEditorNodes.push({
          type: "mention",
          userId: node.attributes.__userId,
        });
      }
    }
  };

  transform(before);
  textEditorNodes.push({
    type: "mention",
    userId: mention.attributes.__userId,
  });
  transform(after);

  return textEditorNodes;
};

export function transformAsLiveblocksTextEditorNodes(
  transformableMention: TransformableMentionNodeWithContext
): LiveblocksTextEditorNode[] {
  switch (transformableMention.textEditorType) {
    case "lexical": {
      return transformLexicalMentionNodeWithContext(
        transformableMention.mention
      );
    }
    case "tiptap": {
      // TODO add transformer for TipTap
      return [];
    }
  }
}

const resolveUsersInLiveblocksTextEditorNodes = async <U extends BaseUserMeta>(
  nodes: LiveblocksTextEditorNode[],
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => OptionalPromise<(U["info"] | undefined)[] | undefined>
): Promise<Map<string, U["info"]>> => {
  const resolvedUsers = new Map<string, U["info"]>();
  if (!resolveUsers) {
    return resolvedUsers;
  }

  const mentionedUserIds = new Set<string>();
  for (const node of nodes) {
    if (node.type === "mention") {
      mentionedUserIds.add(node.userId);
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

export type LiveblocksTextEditorContainerComponentProps = {
  /**
   * The nodes of the text editor
   */
  children: React.ReactNode;
};

export type LiveblocksTextEditorMentionComponentProps<
  U extends BaseUserMeta = DU,
> = {
  /**
   * The mention element.
   */
  element: LiveblocksTextEditorMentionNode;
  /**
   * The mention's user info, if the `resolvedUsers` option was provided.
   */
  user?: U["info"];
};

export type LiveblocksTextEditorTextComponentProps = {
  /**
   * The text element.
   */
  element: LiveblocksTextEditorTextNode;
};

export type ConvertLiveblocksTextEditorNodesAsReactComponents<
  U extends BaseUserMeta = DU,
> = {
  /**
   *
   * The component used to act as a container to wrap text editor nodes,
   */
  Container: React.ComponentType<LiveblocksTextEditorContainerComponentProps>;

  /**
   * The component used to display mentions.
   */
  Mention: React.ComponentType<LiveblocksTextEditorMentionComponentProps<U>>;

  /**
   * The component used to display text nodes.
   */
  Text: React.ComponentType<LiveblocksTextEditorTextComponentProps>;
};

const baseComponents: ConvertLiveblocksTextEditorNodesAsReactComponents<BaseUserMeta> =
  {
    Container: ({ children }) => <div>{children}</div>,
    Mention: ({ element, user }) => (
      <span data-mention>@{user?.name ?? element.userId}</span>
    ),
    Text: ({ element }) => {
      // Note: construction following the schema 👇
      // <code><s><em><strong>{element.text}</strong></s></em></code>
      let children: React.ReactNode = element.text;

      if (element.bold) {
        children = <strong>{children}</strong>;
      }

      if (element.italic) {
        children = <em>{children}</em>;
      }

      if (element.strikethrough) {
        children = <s>{children}</s>;
      }

      if (element.code) {
        children = <code>{children}</code>;
      }

      return <span>{children}</span>;
    },
  };

export type ConvertLiveblocksTextEditorNodesAsReactOptions<
  U extends BaseUserMeta = DU,
> = {
  /**
   * The components used to customize the resulting React nodes. Each components has
   * priority over the base components inherited.
   */
  components?: Partial<ConvertLiveblocksTextEditorNodesAsReactComponents<U>>;
  /**
   * A function that returns user info from user IDs.
   */
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => OptionalPromise<(U["info"] | undefined)[] | undefined>;
};

/**
 * Convert a set of Liveblocks Editor nodes into React elements
 */
export async function convertLiveblocksTextEditorNodesAsReact(
  nodes: LiveblocksTextEditorNode[],
  options?: ConvertLiveblocksTextEditorNodesAsReactOptions<BaseUserMeta>
): Promise<React.ReactNode> {
  const Components = {
    ...baseComponents,
    ...options?.components,
  };
  const resolvedUsers = await resolveUsersInLiveblocksTextEditorNodes(
    nodes,
    options?.resolveUsers
  );

  const children = nodes.map((node, index) => {
    switch (node.type) {
      case "mention":
        return (
          <Components.Mention
            key={`lb-text-editor-mention-${index}-${node.userId}`}
            element={node}
            user={resolvedUsers.get(node.userId)}
          />
        );
      case "text":
        return (
          <Components.Text
            key={`lb-text-editor-text-${index}`}
            element={node}
          />
        );
    }
  });

  return (
    <Components.Container key="lb-text-editor-container">
      {children}
    </Components.Container>
  );
}
