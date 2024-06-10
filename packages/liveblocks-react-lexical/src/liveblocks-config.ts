import type { InitialConfigType } from "@lexical/react/LexicalComposer";

import { ThreadMarkNode } from "./comments/thread-mark-node";
import { MentionNode } from "./mentions/mention-node";

export function liveblocksConfig(
  editorConfig: Omit<InitialConfigType, "editorState">
) {
  const nodes = [...(editorConfig.nodes ?? [])];

  nodes.push(ThreadMarkNode, MentionNode);

  return {
    ...editorConfig,
    nodes,
    editorState: null, // explicitly null because CollabProvider requires it
  };
}
