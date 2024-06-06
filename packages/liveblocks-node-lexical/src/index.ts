import { createHeadlessEditor } from "@lexical/headless";
import { createBinding } from "@lexical/yjs";
import { detectDupes } from "@liveblocks/core";
import type { Liveblocks } from "@liveblocks/node";
import type {
  Klass,
  LexicalEditor,
  LexicalNode,
  LexicalNodeReplacement,
  SerializedEditorState,
  SerializedLexicalNode,
} from "lexical";
import { $getRoot } from "lexical";
import { applyUpdate, Doc, encodeStateAsUpdate, encodeStateVector } from "yjs";

import { createNoOpProvider, registerCollaborationListeners } from "./collab";
import { MentionNode } from "./MentionNodeLite";
import { ThreadMarkNode } from "./ThreadNodeLite";
import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

const LIVEBLOCKS_NODES = [ThreadMarkNode, MentionNode];

export { $createParagraphNode, $createTextNode, $getRoot } from "lexical";

export type LiveblocksDocument = {
  update: (modifyFn: () => void) => Promise<void>;
  getTextContent: () => string;
  getLexicalEditor: () => LexicalEditor;
  toJSON: () => SerializedEditorState<SerializedLexicalNode>;
  destroy: () => Promise<void> | void;
};

export async function createLiveblocksDocument(
  client: Liveblocks,
  roomId: string,
  nodes: ReadonlyArray<Klass<LexicalNode> | LexicalNodeReplacement>
): Promise<LiveblocksDocument> {
  const update = new Uint8Array(
    await client.getYjsDocumentAsBinaryUpdate(roomId)
  );
  const editor = createHeadlessEditor({
    nodes: [...LIVEBLOCKS_NODES, ...nodes],
  });
  const id = "root";
  const doc = new Doc();
  const docMap = new Map([[id, doc]]);
  const provider = createNoOpProvider();
  const binding = createBinding(editor, provider, id, doc, docMap);
  const unsubscribe = registerCollaborationListeners(editor, provider, binding);
  applyUpdate(binding.doc, update);
  editor.update(() => {}, { discrete: true });
  return {
    update: async (modifyFn) => {
      // Flush any pending updates (there really shouldn't be any?), this may be a NOOP
      editor.update(() => {}, { discrete: true });
      const beforeVector = encodeStateVector(binding.doc);
      editor.update(
        () => {
          modifyFn();
        },
        { discrete: true }
      );
      // grab update after diffing
      const diffUpdate = encodeStateAsUpdate(binding.doc, beforeVector);
      return client.sendYjsBinaryUpdate(roomId, diffUpdate);
    },
    getTextContent: () => {
      let content = "";
      editor.getEditorState().read(() => {
        content = $getRoot().getTextContent();
      });
      return content;
    },
    toJSON: () => {
      return editor.getEditorState().toJSON();
    },
    getLexicalEditor: () => {
      return editor;
    },
    destroy: unsubscribe,
  };
}
