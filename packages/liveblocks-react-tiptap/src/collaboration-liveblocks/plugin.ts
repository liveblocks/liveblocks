import type { LsonObject } from "@liveblocks/client";
import { LiveObject } from "@liveblocks/client";
import type { Content } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import { Slice } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

import {
  createDefaultDocument,
  createLiveblocksTiptapNode,
  type LiveblocksTiptapNode,
  liveblocksTiptapNodeToJson,
  type ProseMirrorJsonNode,
  stringifyDocument,
} from "./schema";
import type { LiveblocksTiptapRoom } from "./types";

export const LIVEBLOCKS_COLLABORATION_PLUGIN_KEY = new PluginKey<{
  isReady: boolean;
}>("liveblocks-collaboration");

type LiveblocksCollaborationOptions = {
  room?: LiveblocksTiptapRoom;
  field: string;
  initialContent?: Content;
};

type LiveblocksCollaborationStorage = {
  isDisabled: boolean;
};

function isProseMirrorJsonNode(value: unknown): value is ProseMirrorJsonNode {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { type?: unknown }).type === "string"
  );
}

function getInitialDocument(
  initialContent: Content | undefined,
  view: EditorView
): ProseMirrorJsonNode {
  if (isProseMirrorJsonNode(initialContent)) {
    return initialContent;
  }

  const currentDocument: unknown = view.state.doc.toJSON();
  if (isProseMirrorJsonNode(currentDocument)) {
    return currentDocument;
  }

  return createDefaultDocument();
}

function replaceEditorDocument(
  view: EditorView,
  document: ProseMirrorJsonNode
): void {
  const nextDocument = view.state.schema.nodeFromJSON(document);
  const tr = view.state.tr
    .replace(
      0,
      view.state.doc.content.size,
      new Slice(nextDocument.content, 0, 0)
    )
    .setMeta(LIVEBLOCKS_COLLABORATION_PLUGIN_KEY, { isRemote: true })
    .setMeta("addToHistory", false);

  view.dispatch(tr);
}

function getDocumentRoot(
  root: LiveObject<LsonObject>,
  field: string
): LiveblocksTiptapNode | undefined {
  const documentRoot = root.get(field);
  return documentRoot instanceof LiveObject ? documentRoot : undefined;
}

function setDocumentRoot(
  root: LiveObject<LsonObject>,
  field: string,
  document: ProseMirrorJsonNode
): void {
  root.set(field, createLiveblocksTiptapNode(document));
}

function createLiveblocksCollaborationPlugin(
  options: LiveblocksCollaborationOptions
): Plugin {
  const room = options.room;
  if (room === undefined) {
    throw new Error(
      "[Liveblocks] The Liveblocks collaboration plugin requires a room."
    );
  }

  let view: EditorView | undefined;
  let root: LiveObject<LsonObject> | undefined;
  let unsubscribe: (() => void) | undefined;
  let destroyed = false;
  let isApplyingRemoteUpdate = false;
  let lastDocument = "";

  const applyStorageToEditor = () => {
    if (view === undefined || root === undefined) {
      return;
    }

    const documentRoot = getDocumentRoot(root, options.field);
    if (documentRoot === undefined) {
      return;
    }

    const document = liveblocksTiptapNodeToJson(documentRoot);
    const serializedDocument = stringifyDocument(document);

    if (serializedDocument === lastDocument) {
      return;
    }

    lastDocument = serializedDocument;
    isApplyingRemoteUpdate = true;
    try {
      replaceEditorDocument(view, document);
    } finally {
      isApplyingRemoteUpdate = false;
    }
  };

  return new Plugin({
    key: LIVEBLOCKS_COLLABORATION_PLUGIN_KEY,
    state: {
      init: () => ({ isReady: false }),
      apply(tr, state) {
        const meta = tr.getMeta(LIVEBLOCKS_COLLABORATION_PLUGIN_KEY) as
          | { isReady?: boolean }
          | undefined;

        return meta?.isReady !== undefined
          ? { ...state, isReady: meta.isReady }
          : state;
      },
    },
    appendTransaction(transactions, _oldState, newState) {
      if (
        root === undefined ||
        isApplyingRemoteUpdate ||
        !transactions.some((transaction) => transaction.docChanged) ||
        transactions.some((transaction) =>
          Boolean(transaction.getMeta(LIVEBLOCKS_COLLABORATION_PLUGIN_KEY))
        )
      ) {
        return null;
      }

      const document: unknown = newState.doc.toJSON();
      if (!isProseMirrorJsonNode(document)) {
        return null;
      }

      const serializedDocument = stringifyDocument(document);
      if (serializedDocument === lastDocument) {
        return null;
      }

      lastDocument = serializedDocument;
      room.batch(() => {
        if (root !== undefined) {
          setDocumentRoot(root, options.field, document);
        }
      });

      return null;
    },
    view(editorView) {
      view = editorView;

      room.getStorage().then(({ root: storageRoot }) => {
        if (destroyed) {
          return;
        }

        root = storageRoot;

        if (getDocumentRoot(storageRoot, options.field) === undefined) {
          const initialDocument = getInitialDocument(
            options.initialContent,
            editorView
          );
          lastDocument = stringifyDocument(initialDocument);
          room.history.disable(() => {
            setDocumentRoot(storageRoot, options.field, initialDocument);
          });
        }

        applyStorageToEditor();

        const tr = editorView.state.tr.setMeta(
          LIVEBLOCKS_COLLABORATION_PLUGIN_KEY,
          { isReady: true }
        );
        editorView.dispatch(tr);

        unsubscribe = room.subscribe(
          storageRoot,
          applyStorageToEditor,
          { isDeep: true }
        );
      });

      return {
        update(nextView) {
          view = nextView;
        },
        destroy() {
          destroyed = true;
          unsubscribe?.();
          unsubscribe = undefined;
          view = undefined;
          root = undefined;
        },
      };
    },
  });
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    collaboration: {
      undo: () => ReturnType;
      redo: () => ReturnType;
    };
  }
}

export const LiveblocksCollaboration = Extension.create<
  LiveblocksCollaborationOptions,
  LiveblocksCollaborationStorage
>({
  name: "collaboration",
  priority: 1000,

  addOptions() {
    return {
      room: undefined,
      field: "default",
      initialContent: undefined,
    };
  },

  addStorage() {
    return {
      isDisabled: false,
    };
  },

  addCommands() {
    return {
      undo:
        () =>
        ({ dispatch, tr }) => {
          tr.setMeta("preventDispatch", true);

          if (
            this.options.room === undefined ||
            !this.options.room.history.canUndo()
          ) {
            return false;
          }

          if (dispatch) {
            this.options.room.history.undo();
          }

          return true;
        },
      redo:
        () =>
        ({ dispatch, tr }) => {
          tr.setMeta("preventDispatch", true);

          if (
            this.options.room === undefined ||
            !this.options.room.history.canRedo()
          ) {
            return false;
          }

          if (dispatch) {
            this.options.room.history.redo();
          }

          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-z": () => this.editor.commands.undo(),
      "Mod-y": () => this.editor.commands.redo(),
      "Shift-Mod-z": () => this.editor.commands.redo(),
    };
  },

  addProseMirrorPlugins() {
    return [createLiveblocksCollaborationPlugin(this.options)];
  },
});
