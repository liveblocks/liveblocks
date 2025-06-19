import type {
  Awaitable,
  BaseGroupInfo,
  BaseUserMeta,
  DGI,
  DU,
  ResolveGroupsInfoArgs,
  ResolveUsersArgs,
} from "@liveblocks/core";

import {
  type LiveblocksTextEditorMentionNode,
  type LiveblocksTextEditorNode,
  type LiveblocksTextEditorTextNode,
  resolveGroupsInfoInLiveblocksTextEditorNodes,
  resolveUsersInLiveblocksTextEditorNodes,
} from "./liveblocks-text-editor";

export type TextMentionContentContainerElementArgs<T> = {
  /**
   * The blocks of the text mention content
   */
  children: T[];
};

export type TextMentionContentMentionElementArgs<
  U extends BaseUserMeta = DU,
  GI extends BaseGroupInfo = DGI,
> = {
  /**
   * The text mention node.
   */
  node: LiveblocksTextEditorMentionNode;

  /**
   * The mention's user info, if the mention is a user mention and the `resolvedUsers` option was provided.
   */
  user?: U["info"];

  /**
   * The mention's group info, if the mention is a group mention and the `resolvedGroupsInfo` option was provided.
   */
  group?: GI;
};

export type TextMentionContentTextElementArgs = {
  /**
   * The text element.
   */
  node: LiveblocksTextEditorTextNode;
};

/**
 * Protocol:
 * Text mention content elements to be converted to a custom format `T`
 */
export type ConvertTextMentionContentElements<
  T,
  U extends BaseUserMeta = DU,
  GI extends BaseGroupInfo = DGI,
> = {
  /**
   * The container element used to display text mention content blocks
   */
  container: (args: TextMentionContentContainerElementArgs<T>) => T;
  /**
   * The mention element used to display the mention itself.
   */
  mention: (
    args: TextMentionContentMentionElementArgs<U, GI>,
    index: number
  ) => T;
  /**
   * The text element used to display the text surrounding the mention.
   */
  text: (args: TextMentionContentTextElementArgs, index: number) => T;
};

export type ConvertTextMentionContentOptions<
  T,
  U extends BaseUserMeta = DU,
  GI extends BaseGroupInfo = DGI,
> = {
  /**
   * A function that returns user info from user IDs.
   * You should return a list of user objects of the same size, in the same order.
   */
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => Awaitable<(U["info"] | undefined)[] | undefined>;

  /**
   * A function that returns group info from group IDs.
   * You should return a list of group info objects of the same size, in the same order.
   */
  resolveGroupsInfo?: (
    args: ResolveGroupsInfoArgs
  ) => Awaitable<(GI | undefined)[] | undefined>;

  /**
   * The elements used to customize the resulting format `T`.
   */
  elements: ConvertTextMentionContentElements<T, U, GI>;
};

/**
 * Convert a text mention content nodes to a custom format `T`.
 */
export async function convertTextMentionContent<
  T,
  U extends BaseUserMeta = DU,
  GI extends BaseGroupInfo = DGI,
>(
  nodes: LiveblocksTextEditorNode[],
  options: ConvertTextMentionContentOptions<T, U, GI>
): Promise<T> {
  const resolvedUsers = await resolveUsersInLiveblocksTextEditorNodes(
    nodes,
    options?.resolveUsers
  );
  const resolvedGroupsInfo = await resolveGroupsInfoInLiveblocksTextEditorNodes(
    nodes,
    options?.resolveGroupsInfo
  );

  const blocks: T[] = nodes.map((node, index) => {
    switch (node.type) {
      case "mention": {
        return options.elements.mention(
          {
            node,
            user: node.kind === "user" ? resolvedUsers.get(node.id) : undefined,
            group:
              node.kind === "group"
                ? resolvedGroupsInfo.get(node.id)
                : undefined,
          },
          index
        );
      }
      case "text": {
        return options.elements.text({ node }, index);
      }
    }
  });

  return options.elements.container({ children: blocks });
}
