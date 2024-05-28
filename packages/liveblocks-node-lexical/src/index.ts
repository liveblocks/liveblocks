import { detectDupes } from "@liveblocks/core";
import type { Liveblocks } from "@liveblocks/node";
import type {
  EditorState,
  Klass,
  LexicalNode,
  LexicalNodeReplacement,
  RootNode,
} from "lexical";
import { $getRoot } from "lexical";
import {
  applyUpdate,
  encodeStateAsUpdate,
  encodeStateVectorFromUpdate,
} from "yjs";

import { withHeadlessCollaborationEditor } from "./headless";
import { MentionNode } from "./MentionNodeLite";
import { ThreadMarkNode } from "./ThreadNodeLite";
import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

const LIVEBLOCKS_NODES = [ThreadMarkNode, MentionNode];

export { $createParagraphNode, $createTextNode, $getRoot } from "lexical";

// get editor state
export async function getEditorState(
  client: Liveblocks,
  roomId: string,
  nodes: ReadonlyArray<Klass<LexicalNode> | LexicalNodeReplacement>
): Promise<EditorState> {
  const doc = await client.getYjsDocumentAsBinaryUpdate(roomId);
  const update = new Uint8Array(doc);
  return withHeadlessCollaborationEditor(
    [...LIVEBLOCKS_NODES, ...nodes],
    (editor, binding) => {
      applyUpdate(binding.doc, update);
      editor.update(() => {}, { discrete: true });
      return editor.getEditorState();
    }
  );
}

// modify document
export async function modifyDocument(
  client: Liveblocks,
  roomId: string,
  nodes: ReadonlyArray<Klass<LexicalNode> | LexicalNodeReplacement>,
  modifyFn: (root: RootNode) => void
): Promise<void> {
  const doc = await client.getYjsDocumentAsBinaryUpdate(roomId);
  const update = new Uint8Array(doc);
  await withHeadlessCollaborationEditor(
    [...LIVEBLOCKS_NODES, ...nodes],
    (editor, binding) => {
      applyUpdate(binding.doc, update);
      editor.update(() => {}, { discrete: true });
      console.log("GOT UPDATE!");
      const beforeVector = encodeStateVectorFromUpdate(update);
      console.log("before vector: ", beforeVector);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      editor.update(
        () => {
          const root = $getRoot();
          modifyFn(root);
        },
        { discrete: true }
      );
      const afterUpdate = encodeStateAsUpdate(binding.doc, beforeVector);
      return client.sendYjsBinaryUpdate(roomId, afterUpdate);
    }
  );
}
