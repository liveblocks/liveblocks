import type { InitialConfigType } from "@lexical/react/LexicalComposer";
import type { ComponentType } from "react";

import { ThreadMarkNode } from "./comments/thread-mark-node";
import { MentionNode } from "./mentions/mention-node";

interface MentionProps {
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
   * Whether mentions are enabled. Defaults to true.
   */
  mentions: boolean;
  /**
   * Whether comments are enabled. Defaults to true.
   */
  comments: boolean;
  /**
   * The components displayed within the editor.
   */
  components: Partial<EditorComponents>;
}

const defaultComponents: EditorComponents = {
  Mention: () => {
    // TODO
    return null;
  },
};

let liveblocksConfig: LiveblocksConfig = {
  mentions: true,
  comments: true,
  components: defaultComponents,
};

export function liveblocksLexicalConfig(
  editorConfig: InitialConfigType,
  config: Partial<LiveblocksConfig> = {}
) {
  const {
    mentions = true,
    comments = true,
    components = defaultComponents,
  } = config;

  const nodes = [...(editorConfig.nodes ?? [])];

  // Add mention node if it's not already in the list of nodes and if mentions are enabled in the config
  if (!nodes.includes(MentionNode) && mentions) {
    nodes.push(MentionNode);
  }

  // Similarly, add thread mark node if it's not already in the list of nodes and if comments are enabled in the config
  if (!nodes.includes(ThreadMarkNode) && comments) {
    nodes.push(ThreadMarkNode);
  }

  liveblocksConfig = {
    mentions,
    comments,
    components,
  };

  return {
    ...editorConfig,
    nodes,
    editorState: null, // explicitly null because CollabProvider requires it
  };
}

export function getLiveblocksConfig(): LiveblocksConfig {
  return {
    ...liveblocksConfig,
  };
}
