/**
 * Liveblocks Text Editor
 *
 * Expose common types to transform nodes from different editors like `Lexical` or `TipTap`
 * and then convert them more easily as React or as html.
 */

import {
  type BaseUserMeta,
  type DU,
  html,
  htmlSafe,
  type OptionalPromise,
  type ResolveUsersArgs,
} from "@liveblocks/core";
import React from "react";

import type {
  LexicalMentionNodeWithContext,
  SerializedLexicalNode,
  SerializedTextNode,
} from "./lexical-editor";
import { isSerializedMentionNode as isSerializedLexicalMentionNode } from "./lexical-editor";
import { MENTION_CHARACTER } from "./lib/constants";
import type { CSSProperties } from "./lib/css-properties";
import { toInlineCSSString } from "./lib/css-properties";
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

export type LiveblocksTextEditorMentionNode = {
  type: "mention";
  userId: string;
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
          userId: node.attrs.id,
        });
      }
    }
  };

  transform(before);
  textEditorNodes.push({
    type: "mention",
    userId: mention.attrs.id,
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
 * Resolves mentioned users in Liveblocks Text Editor node
 */
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
      <span data-mention>
        {MENTION_CHARACTER}
        {user?.name ?? element.userId}
      </span>
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
 * @internal
 *
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

export type ConvertLiveblocksTextEditorNodesAsHtmlStyles = {
  /**
   * The default inline CSS styles used to display container element.
   */
  container: CSSProperties;
  /**
   * The default inline CSS styles used to display text `<strong />` elements.
   */
  strong: CSSProperties;
  /**
   * The default inline CSS styles used to display text `<code />` elements.
   */
  code: CSSProperties;
  /**
   * The default inline CSS styles used to display mentions.
   */
  mention: CSSProperties;
};

export const baseStyles: ConvertLiveblocksTextEditorNodesAsHtmlStyles = {
  container: {
    fontSize: "14px",
  },
  strong: {
    fontWeight: 500,
  },
  code: {
    fontFamily:
      'ui-monospace, Menlo, Monaco, "Cascadia Mono", "Segoe UI Mono", "Roboto Mono", "Oxygen Mono", "Ubuntu Mono", "Source Code Pro", "Fira Mono", "Droid Sans Mono", "Consolas", "Courier New", monospace',
    backgroundColor: "rgba(0,0,0,0.05)",
    border: "solid 1px rgba(0,0,0,0.1)",
    borderRadius: "4px",
  },
  mention: {
    color: "blue",
  },
};

export type ConvertLiveblocksTextEditorNodesAsHtmlOptions<
  U extends BaseUserMeta = DU,
> = {
  /**
   * The styles used to customize the html elements in the resulting html safe string.
   * Each styles has priority over the base styles inherited.
   */
  styles?: Partial<ConvertLiveblocksTextEditorNodesAsHtmlStyles>;
  /**
   * A function that returns user info from user IDs.
   */
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => OptionalPromise<(U["info"] | undefined)[] | undefined>;
};

/**
 * @internal
 *
 * Convert a set of Liveblocks Editor nodes into an html safe string
 * with inline css styles
 */
export async function convertLiveblocksTextEditorNodesAsHtml(
  nodes: LiveblocksTextEditorNode[],
  options?: ConvertLiveblocksTextEditorNodesAsHtmlOptions<BaseUserMeta>
): Promise<string> {
  const styles = { ...baseStyles, ...options?.styles };
  const resolvedUsers = await resolveUsersInLiveblocksTextEditorNodes(
    nodes,
    options?.resolveUsers
  );

  // NOTE: using prettier-ignore to preserve template strings
  const children = nodes
    .map((node) => {
      switch (node.type) {
        case "mention": {
          const user = resolvedUsers.get(node.userId);
          // prettier-ignore
          return html`<span data-mention style="${toInlineCSSString(styles.mention)}">${MENTION_CHARACTER}${user?.name ?? node.userId}</span>`
        }
        case "text": {
          // Note: construction following the schema 👇
          // <code><s><em><strong>{node.text}</strong></s></em></code>
          let children = node.text;
          if (!children) {
            return children;
          }

          if (node.bold) {
            // prettier-ignore
            children = html`<strong style="${toInlineCSSString(styles.strong)}">${children}</strong>`;
          }

          if (node.italic) {
            // prettier-ignore
            children = html`<em>${children}</em>`;
          }

          if (node.strikethrough) {
            // prettier-ignore
            children = html`<s>${children}</s>`;
          }

          if (node.code) {
            // prettier-ignore
            children = html`<code style="${toInlineCSSString(styles.code)}">${children}</code>`;
          }

          return children;
        }
      }
    })
    .join("\n");

  // prettier-ignore
  return html`<div style=${toInlineCSSString(styles.container)}">${htmlSafe(children)}</div>`;
}
