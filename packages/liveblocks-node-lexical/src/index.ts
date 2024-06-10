import { createHeadlessEditor } from "@lexical/headless";
import { $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { createBinding } from "@lexical/yjs";
import { detectDupes } from "@liveblocks/core";
import type { Liveblocks } from "@liveblocks/node";
import type {
  EditorState,
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

export type LiveblocksLexicalOptions = {
  roomId: string;
  nodes?: ReadonlyArray<Klass<LexicalNode> | LexicalNodeReplacement>;
  client: Liveblocks;
};

export type LiveblocksDocumentApi = {
  refresh: () => Promise<void>;
  update: (modifyFn: () => void) => Promise<void>;
  getTextContent: () => string;
  getEditorState: () => EditorState;
  getLexicalEditor: () => LexicalEditor;
  toJSON: () => SerializedEditorState<SerializedLexicalNode>;
  toMarkdown: () => string;
};

export async function withLexicalDocument<T>(
  { roomId, nodes, client }: LiveblocksLexicalOptions,
  callback: (api: LiveblocksDocumentApi) => Promise<T> | T
): Promise<T> {
  const update = new Uint8Array(
    await client.getYjsDocumentAsBinaryUpdate(roomId)
  );
  const editor = createHeadlessEditor({
    nodes: [...LIVEBLOCKS_NODES, ...(nodes ?? [])],
  });
  const id = "root";
  const doc = new Doc();
  const docMap = new Map([[id, doc]]);
  const provider = createNoOpProvider();
  const binding = createBinding(editor, provider, id, doc, docMap);
  const unsubscribe = registerCollaborationListeners(editor, provider, binding);
  applyUpdate(binding.doc, update);
  editor.update(() => {}, { discrete: true });

  const val = await callback({
    refresh: async () => {
      const latest = new Uint8Array(
        await client.getYjsDocumentAsBinaryUpdate(roomId)
      );
      applyUpdate(binding.doc, latest);
      editor.update(() => {}, { discrete: true });
    },
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
    toMarkdown: () => {
      let markdown: string = "";
      editor.getEditorState().read(() => {
        markdown = $convertToMarkdownString(TRANSFORMERS);
      });
      return markdown;
    },
    getEditorState: () => {
      return editor.getEditorState();
    },
    getLexicalEditor: () => {
      return editor;
    },
  });
  unsubscribe();

  return val;
}
