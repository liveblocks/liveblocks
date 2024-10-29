/**
 * Liveblocks Text Editor Nodes
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
} from "./lexical-editor";
import { assertSerializedMentionNode } from "./lexical-editor";

export type LiveblocksTextEditorTextNode = {
  type: "text";
  text: string;
};
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

const transformLexicalMentionNodeWithContext = (
  mentionNodeWithContext: LexicalMentionNodeWithContext
): LiveblocksTextEditorNode[] => {
  const textEditorNodes: LiveblocksTextEditorNode[] = [];
  const { before, after, mention } = mentionNodeWithContext;

  const transform = (nodes: SerializedLexicalNode[]) => {
    for (const node of nodes) {
      if (node.group === "text") {
        textEditorNodes.push({
          type: "text",
          text: node.text,
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
  element: LiveblocksTextEditorMentionNode;
  /**
   * The mention's user info, if the `resolvedUsers` option was provided.
   */
  user?: U["info"];
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
};

const baseComponents: ConvertLiveblocksTextEditorNodesAsReactComponents<BaseUserMeta> =
  {
    Container: ({ children }) => <div>{children}</div>,
    Mention: ({ element, user }) => (
      <span data-mention>@{user?.name ?? element.userId}</span>
    ),
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
        // TODO: add text logic with styling
        return <>{node.text}</>;
    }
  });

  return (
    <Components.Container key="lb-text-editor-container">
      {children}
    </Components.Container>
  );
}
