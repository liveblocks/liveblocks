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
import { GroupMentionNode } from "./GroupMentionNodeLite";
import { MentionNode } from "./MentionNodeLite";
import { ThreadMarkNode } from "./ThreadNodeLite";
import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

const LIVEBLOCKS_NODES = [ThreadMarkNode, MentionNode, GroupMentionNode];

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

/**
 *
 * `withLexicalDocument` is the main entry point to access and modify Lexical documents on your backend.
 * This function internally instantiates a Lexical headless editor and allows you to modify and export its values asynchronously
 * with a simplified interface.
 *
 * @param options Specify the roomId, client, and nodes.
 * @param callback The call back function is optionally async and receives the document API as its only argument.
 *
 * @example
 *
 * import { Liveblocks } from "@liveblocks/node";
 * import { withLexicalDocument } from "@liveblocks/node-lexical";
 *
 * const client = new Liveblocks({secret: "sk_your_secret_key"});
 * const text = await withLexicalDocument(
 *   { client, roomId: "your-room" },
 *   async (doc) => {
 *     await doc.update(() => {
 *       const root = $getRoot();
 *       const paragraphNode = $createParagraphNode();
 *       const textNode = $createTextNode("Hello from node");
 *       paragraphNode.append(textNode);
 *       root.append(paragraphNode);
 *     });
 *     return doc.getTextContent();
 *   }
 * );
 *
 */
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
    /**
     * Fetches and resyncs the latest document with Liveblocks
     */
    refresh: async () => {
      const latest = new Uint8Array(
        await client.getYjsDocumentAsBinaryUpdate(roomId)
      );
      applyUpdate(binding.doc, latest);
      editor.update(() => {}, { discrete: true });
    },
    /**
     * Provide a callback to modify documetns with Lexical's standard api. All calls are discrete.
     */
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
    /**
     * Helper function to easily provide the text content from the root, i.e. `$getRoot().getTextContent()`
     */
    getTextContent: () => {
      let content = "";
      editor.getEditorState().read(() => {
        content = $getRoot().getTextContent();
      });
      return content;
    },
    /**
     * Helper function to return editorState in JSON form
     */
    toJSON: () => {
      return editor.getEditorState().toJSON();
    },
    /**
     * Helper function to return editor state as Markdown
     */
    toMarkdown: () => {
      let markdown: string = "";
      editor.getEditorState().read(() => {
        markdown = $convertToMarkdownString(TRANSFORMERS);
      });
      return markdown;
    },
    /**
     * Helper function to return the editor's current state
     */
    getEditorState: () => {
      return editor.getEditorState();
    },
    /**
     * Helper function to return the current headless editor instance
     */
    getLexicalEditor: () => {
      return editor;
    },
  });
  unsubscribe();

  return val;
}
