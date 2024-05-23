import type { InitialConfigType } from "@lexical/react/LexicalComposer";
import type { ComponentType } from "react";
import * as React from "react";

import { ThreadMarkNode } from "./comments/thread-mark-node";
import type { LiveblocksLexicalInternalConfig } from "./liveblocks-plugin";
import { Mention } from "./mentions/mention-component";
import { createMentionNodeFactory } from "./mentions/mention-node";
import User from "./mentions/user";

let liveblocksConfig: LiveblocksLexicalInternalConfig | null = null;

export interface MentionProps {
  /**
   * The mention's user ID.
   */
  userId: string;
}

interface EditorComponents {
  Mention: ComponentType<MentionProps>;
}

export interface LiveblocksConfig {
  /**
   * Whether comments are enabled. Defaults to true.
   */
  comments?: boolean;
  /**
   * The components displayed within the editor.
   */
  components?: Partial<EditorComponents>;
}

const MENTION_CHARACTER = "@";
const defaultComponents: EditorComponents = {
  Mention: ({ userId }) => {
    return (
      <Mention>
        {MENTION_CHARACTER}
        <User userId={userId} />
      </Mention>
    );
  },
};

export function liveblocksLexicalConfig(
  editorConfig: InitialConfigType,
  config: LiveblocksConfig = {}
) {
  const { comments = true, components = {} } = config;

  const nodes = [...(editorConfig.nodes ?? [])];

  const mentionFactory = createMentionNodeFactory(
    components.Mention ?? defaultComponents.Mention
  );

  nodes.push(ThreadMarkNode, mentionFactory.MentionNode);

  liveblocksConfig = {
    comments,
    mentions: {
      factory: mentionFactory,
    },
  };

  return {
    ...editorConfig,
    nodes,
    editorState: null, // explicitly null because CollabProvider requires it
  };
}

export function getLiveblocksLexicalConfig(): LiveblocksLexicalInternalConfig {
  if (liveblocksConfig === null) {
    throw new Error("Liveblocks config is not initialized.");
  }
  return {
    ...liveblocksConfig,
  };
}
