import type { Liveblocks } from "@liveblocks/node";
import type { Extension, TextSerializer } from "@tiptap/core";
import { getSchema, getText } from "@tiptap/core";
import type { Node, Schema } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";
import { EditorState } from "@tiptap/pm/state";
import StarterKit, { type StarterKitOptions } from "@tiptap/starter-kit";
import type { MarkdownSerializer } from "prosemirror-markdown";
import { defaultMarkdownSerializer } from "prosemirror-markdown";
import { initProseMirrorDoc, updateYFragment } from "y-prosemirror";
import { applyUpdate, Doc, encodeStateAsUpdate, encodeStateVector } from "yjs";

import { CommentExtension } from "./comment";
import { GroupMentionExtension } from "./group-mention";
import { MentionExtension } from "./mention";

export type LiveblocksProsemirrorOptions = {
  roomId: string;
  schema?: Schema;
  client: Liveblocks;
  field?: string;
};

export type LiveblocksDocumentApi = {
  refresh: () => Promise<void>;
  update: (
    modifyFn: (doc: Node, tr: Transaction) => Transaction
  ) => Promise<void>;
  setContent: (content: null | object | string) => Promise<void>;
  clearContent: () => Promise<void>;
  getText: (options?: {
    blockSeparator?: string;
    textSerializers?: Record<string, TextSerializer>;
  }) => string;
  getEditorState: () => EditorState;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toJSON: () => any; // upstream ProseMirror uses "any"
  toMarkdown: () => string;
};

const DEFAULT_SCHEMA = getSchema([
  CommentExtension,
  MentionExtension,
  StarterKit,
  GroupMentionExtension,
]);

const getLiveblocksDocumentState = async (
  roomId: string,
  client: Liveblocks,
  schema: Schema,
  field: string
) => {
  const update = new Uint8Array(
    await client.getYjsDocumentAsBinaryUpdate(roomId)
  );
  const ydoc = new Doc();
  applyUpdate(ydoc, update);
  const fragment = ydoc.getXmlFragment(field ?? "default");
  const { mapping, doc } = initProseMirrorDoc(fragment, schema);
  const state = EditorState.create({
    schema,
    doc,
  });

  return {
    fragment,
    state,
    ydoc,
    mapping,
  };
};

/**
 *
 * This is simplified re-implementation of TipTap's createDocument function
 *
 * @param content
 * @param schema
 * @param parseOptions
 * @returns
 */
const createDocumentFromContent = (content: object, schema: Schema) => {
  try {
    return schema.nodeFromJSON(content);
  } catch (error) {
    console.warn(
      "[warn]: Invalid content.",
      "Passed value:",
      content,
      "Error:",
      error
    );
    return false;
  }
};

/**
 *
 * `withProsemirrorDocument` is the main entry point to access and modify prosemirror (or TipTap) documents on your backend.
 * This function internally instantiates a Prosemirror state and allows you to modify and export its values asynchronously
 * with a simplified interface. It's important to note that the api works with Prosemirror's document state and Transactions api.
 *
 * @param options Specify the roomId, client, and optionally the prosemirror schema. If no schema is applied, a default schema of TipTap's StarterKit + Liveblocks mentions/comments is used.
 * @param callback The call back function is optionally async and receives the document API as its only argument.
 *
 * @example
 *
 * import { Liveblocks } from "@liveblocks/node";
 * import { withProsemirrorDocument } from "@liveblocks/node-prosemirror";
 *
 * const client = new Liveblocks({secret: "sk_your_secret_key"});
 * const text = await withProsemirrorDocument(
 *   { client, roomId: "your-room" },
 *   async (docApi) => {
 *     await docApi.update((tr) => {
 *       return tr.insertText("Hello World, from Liveblocks!!", 0);
 *     });
 *     return docApi.getTextContent();
 *   }
 * );
 *
 */
export async function withProsemirrorDocument<T>(
  { roomId, schema: maybeSchema, client, field }: LiveblocksProsemirrorOptions,
  callback: (api: LiveblocksDocumentApi) => Promise<T> | T
): Promise<T> {
  const schema = maybeSchema ?? DEFAULT_SCHEMA;
  let liveblocksState = await getLiveblocksDocumentState(
    roomId,
    client,
    schema,
    field ?? "default"
  );

  const val = await callback({
    /**
     * Fetches and resyncs the latest document with Liveblocks
     */
    async refresh() {
      liveblocksState = await getLiveblocksDocumentState(
        roomId,
        client,
        schema,
        field ?? "default"
      );
    },
    /**
     * Provide a callback to modify documetns with Lexical's standard api. All calls are discrete.
     */
    async update(modifyFn) {
      const { ydoc, fragment, state, mapping } = liveblocksState;
      // Flush any pending updates (there really shouldn't be any?), this may be a NOOP
      const beforeVector = encodeStateVector(ydoc);
      const afterState = state.apply(modifyFn(state.doc, state.tr));
      ydoc.transact(() => {
        updateYFragment(ydoc, fragment, afterState.doc, mapping);
      });
      // grab update after diffing
      const diffUpdate = encodeStateAsUpdate(ydoc, beforeVector);
      await client.sendYjsBinaryUpdate(roomId, diffUpdate);
      await this.refresh();
    },

    /**
     * allows you to set content similar to TipTap's setcontent. Only accepts nulls, objects or strings.
     * Unlike TipTap, strings won't be parsed with DOMParser
     * */
    async setContent(content: null | object | string) {
      if (typeof content === "string") {
        return this.update((doc, tr) => {
          tr.delete(0, doc.content.size);
          tr.insertText(content);
          return tr;
        });
      }
      if (content === null) {
        return this.clearContent();
      }
      const node = createDocumentFromContent(content, schema);
      if (!node) {
        throw "Invalid content";
      }
      return this.update((doc, tr) => {
        tr.delete(0, doc.content.size);
        tr.insert(0, node);
        return tr;
      });
    },
    async clearContent() {
      await this.update((doc, tr) => {
        tr.delete(0, doc.content.size);
        return tr;
      });
    },

    /**
     * Uses TipTap's getText function, which allows passing a custom text serializer
     */
    getText(options?: {
      blockSeparator?: string;
      textSerializers?: Record<string, TextSerializer>;
    }) {
      const { state } = liveblocksState;
      return getText(state.doc, options);
    },

    /**
     * Helper function to return prosemirror document in JSON form
     */
    toJSON() {
      // upstream ProseMirror uses "any" type for json
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return liveblocksState.state.doc.toJSON();
    },
    /**
     * Helper function to return editor state as Markdown. By default it uses the defaultMarkdownSerializer from prosemirror-markdown, but you may pass your own
     */
    toMarkdown(serializer?: MarkdownSerializer) {
      return (serializer ?? defaultMarkdownSerializer).serialize(
        liveblocksState.state.doc
      );
    },
    /**
     * Helper function to return the editor's current prosemirror state
     */
    getEditorState() {
      return liveblocksState.state;
    },
  });
  return val;
}
