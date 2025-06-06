import type {
  Awaitable,
  BaseUserMeta,
  DU,
  ResolveUsersArgs,
} from "@liveblocks/core";
import { assertNever } from "@liveblocks/core";

import {
  type LiveblocksTextEditorMentionNode,
  type LiveblocksTextEditorNode,
  type LiveblocksTextEditorTextNode,
  resolveUsersInLiveblocksTextEditorNodes,
} from "./liveblocks-text-editor";

export type MentionContentContainerElementArgs<T> = {
  /**
   * The blocks of the mention content
   */
  children: T[];
};

export type MentionContentMentionElementArgs<U extends BaseUserMeta = DU> = {
  /**
   * The mention node.
   */
  node: LiveblocksTextEditorMentionNode;
  /**
   * The mention's user info, if the `resolvedUsers` option was provided.
   */
  user?: U["info"];
};

export type MentionContentTextElementArgs = {
  /**
   * The text element.
   */
  node: LiveblocksTextEditorTextNode;
};

/**
 * Protocol:
 * Mention content elements to be converted to a custom format `T`
 */
export type ConvertMentionContentElements<T, U extends BaseUserMeta = DU> = {
  /**
   * The container element used to display mention content blocks
   */
  container: (args: MentionContentContainerElementArgs<T>) => T;
  /**
   * The mention element used to display the mention itself.
   */
  mention: (args: MentionContentMentionElementArgs<U>, index: number) => T;
  /**
   * The text element used to display the text surrounding the mention.
   */
  text: (args: MentionContentTextElementArgs, index: number) => T;
};

export type ConvertMentionContentionOptions<T, U extends BaseUserMeta = DU> = {
  /**
   * A function that returns user info from user IDs.
   * You should return a list of user objects of the same size, in the same order.
   */
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => Awaitable<(U["info"] | undefined)[] | undefined>;

  /**
   * The elements used to customize the resulting format `T`.
   */
  elements: ConvertMentionContentElements<T, U>;
};

/**
 * Convert a mention content nodes to a custom format `T`.
 */
export async function convertMentionContent<T, U extends BaseUserMeta = DU>(
  nodes: LiveblocksTextEditorNode[],
  options: ConvertMentionContentionOptions<T, U>
): Promise<T> {
  const resolvedUsers = await resolveUsersInLiveblocksTextEditorNodes(
    nodes,
    options?.resolveUsers
  );

  const blocks: T[] = nodes.map((node, index) => {
    switch (node.type) {
      case "mention": {
        if (node.kind !== "user") {
          return assertNever(node.kind, "Unknown mention kind");
        }

        return options.elements.mention(
          { node, user: resolvedUsers.get(node.id) },
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
