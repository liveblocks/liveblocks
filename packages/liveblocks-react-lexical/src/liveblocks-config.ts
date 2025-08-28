import type { InitialConfigType } from "@lexical/react/LexicalComposer";

import { ThreadMarkNode } from "./comments/thread-mark-node";
import { GroupMentionNode } from "./mentions/group-mention-node";
import { MentionNode } from "./mentions/mention-node";

/**
 * Function that takes a Lexical editor config and modifies it to add the necessary
 * `nodes` and `theme` to make `LiveblocksPlugin` works correctly.
 *
 * @example
 * import { LexicalComposer } from "@lexical/react/LexicalComposer";
 * import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
 * import { ContentEditable } from "@lexical/react/LexicalContentEditable";
 * import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
 * import { liveblocksConfig, LiveblocksPlugin } from "@liveblocks/react-lexical";
 *
 * const initialConfig = liveblocksConfig({
 *   namespace: "MyEditor",
 *   theme: {},
 *   nodes: [],
 *   onError: (err) => console.error(err),
 * });
 *
 * function Editor() {
 *   return (
 *     <LexicalComposer initialConfig={initialConfig}>
 *       <LiveblocksPlugin />
 *       <RichTextPlugin
 *         contentEditable={<ContentEditable />}
 *         placeholder={<div>Enter some text...</div>}
 *         ErrorBoundary={LexicalErrorBoundary}
 *       />
 *     </LexicalComposer>
 *   );
 * }
 */
export function liveblocksConfig(
  editorConfig: Omit<InitialConfigType, "editorState">
) {
  const nodes = [...(editorConfig.nodes ?? [])];

  nodes.push(ThreadMarkNode, MentionNode, GroupMentionNode);

  return {
    ...editorConfig,
    nodes,
    editorState: null, // explicitly null because CollabProvider requires it
  };
}
