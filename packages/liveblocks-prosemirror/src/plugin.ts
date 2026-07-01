import type { LsonObject, StorageUpdate } from "@liveblocks/client";
import { LiveMap, LiveObject } from "@liveblocks/client";
import { kStorageUpdateSource } from "@liveblocks/core";
import { Slice } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

import { applyRemoteStorageUpdates } from "./remote";
import {
  createLiveblocksProsemirrorNode,
  type LiveblocksProsemirrorNode,
  liveblocksProsemirrorNodeToJson,
  type ProseMirrorJsonNode,
  stringifyDocument,
} from "./schema";
import { applyIncrementalOperations, classifyTransaction } from "./steps";
import type { LiveblocksProsemirrorRoom } from "./types";

export const LIVEBLOCKS_COLLABORATION_PLUGIN_KEY = new PluginKey<{
  isReady: boolean;
}>("liveblocks-collaboration");
export const LIVEBLOCKS_TIPTAP_DOCUMENTS_KEY = "_tiptap_docs";

export type LiveblocksCollaborationOptions = {
  room?: LiveblocksProsemirrorRoom;
  field: string;
  initialContent?: ProseMirrorJsonNode;
  fallbackDocument?: () => ProseMirrorJsonNode;
};

function isProseMirrorJsonNode(value: unknown): value is ProseMirrorJsonNode {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { type?: unknown }).type === "string"
  );
}

function getInitialDocument(
  initialContent: ProseMirrorJsonNode | undefined,
  fallbackDocument: (() => ProseMirrorJsonNode) | undefined,
  view: EditorView
): ProseMirrorJsonNode {
  if (isProseMirrorJsonNode(initialContent)) {
    return initialContent;
  }

  const currentDocument: unknown = view.state.doc.toJSON();
  if (isProseMirrorJsonNode(currentDocument)) {
    return currentDocument;
  }

  const fallback = fallbackDocument?.();
  if (isProseMirrorJsonNode(fallback)) {
    return fallback;
  }

  throw new Error(
    "[Liveblocks] The Liveblocks collaboration plugin could not resolve an initial document."
  );
}

function replaceEditorDocument(
  view: EditorView,
  document: ProseMirrorJsonNode,
  fallbackDocument: (() => ProseMirrorJsonNode) | undefined
): void {
  let nextDocument;
  try {
    nextDocument = view.state.schema.nodeFromJSON(document);
  } catch {
    const fallback = fallbackDocument?.();
    if (!isProseMirrorJsonNode(fallback)) {
      return;
    }

    nextDocument = view.state.schema.nodeFromJSON(fallback);
  }

  if (nextDocument.childCount === 0) {
    const fallback = fallbackDocument?.();
    if (!isProseMirrorJsonNode(fallback)) {
      return;
    }

    nextDocument = view.state.schema.nodeFromJSON(fallback);
  }

  const tr = view.state.tr.replace(
    0,
    view.state.doc.content.size,
    new Slice(nextDocument.content, 0, 0)
  );

  tr.setMeta(LIVEBLOCKS_COLLABORATION_PLUGIN_KEY, { isRemote: true }).setMeta(
    "addToHistory",
    false
  );

  view.dispatch(tr);
}

function getDocumentRoot(
  root: LiveObject<LsonObject>,
  field: string
): LiveblocksProsemirrorNode | undefined {
  const documents = root.get(LIVEBLOCKS_TIPTAP_DOCUMENTS_KEY);
  if (!(documents instanceof LiveMap)) {
    return undefined;
  }

  const documentRoot = documents.get(field);
  if (!(documentRoot instanceof LiveObject)) {
    return undefined;
  }

  return documentRoot as LiveblocksProsemirrorNode;
}

function setDocumentRoot(
  root: LiveObject<LsonObject>,
  field: string,
  document: ProseMirrorJsonNode
): void {
  let documents = root.get(LIVEBLOCKS_TIPTAP_DOCUMENTS_KEY);
  if (!(documents instanceof LiveMap)) {
    documents = new LiveMap<string, LiveblocksProsemirrorNode>();
    root.set(LIVEBLOCKS_TIPTAP_DOCUMENTS_KEY, documents);
  }

  documents.set(field, createLiveblocksProsemirrorNode(document));
}

export function createLiveblocksCollaborationPlugin(
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
  let isApplyingLocalUpdate = false;
  let lastDocument = "";

  const applyStorageToEditor = (updates?: StorageUpdate[]) => {
    if (view === undefined || root === undefined) {
      return;
    }

    const documentRoot = getDocumentRoot(root, options.field);
    if (documentRoot === undefined) {
      return;
    }

    if (isApplyingLocalUpdate) {
      return;
    }

    const document = liveblocksProsemirrorNodeToJson(
      documentRoot,
      options.fallbackDocument
    );
    const serializedDocument = stringifyDocument(document);

    if (serializedDocument === lastDocument) {
      return;
    }

    if (updates !== undefined) {
      const result = applyRemoteStorageUpdates(view, documentRoot, updates);
      if (result.type === "applied") {
        lastDocument = serializedDocument;
        isApplyingRemoteUpdate = true;
        try {
          view.dispatch(
            result.tr
              .setMeta(LIVEBLOCKS_COLLABORATION_PLUGIN_KEY, { isRemote: true })
              .setMeta("addToHistory", false)
          );
        } finally {
          isApplyingRemoteUpdate = false;
        }
        return;
      }
    }

    lastDocument = serializedDocument;
    isApplyingRemoteUpdate = true;
    try {
      replaceEditorDocument(view, document, options.fallbackDocument);
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
    appendTransaction(transactions, oldState, newState) {
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

      const currentRoot = root;

      const documentRoot = getDocumentRoot(currentRoot, options.field);

      // Idempotency guard: if the incoming document already matches what we
      // last synced to storage, there is nothing to do. This naturally handles
      // editors (e.g. BlockNote) that invoke appendTransaction more than once
      // per user edit with the same transaction set
      const incomingDocument: unknown = newState.doc.toJSON();
      if (!isProseMirrorJsonNode(incomingDocument)) {
        return null;
      }
      const serializedIncoming = stringifyDocument(incomingDocument);
      if (serializedIncoming === lastDocument) {
        return null;
      }

      const classified =
        documentRoot !== undefined
          ? classifyTransaction(
              transactions,
              oldState.doc,
              newState.doc,
              documentRoot
            )
          : { type: "unsupported" as const };

      isApplyingLocalUpdate = true;
      try {
        room.batch(() => {
          if (classified.type === "incremental") {
            applyIncrementalOperations(classified.operations);
          } else {
            setDocumentRoot(currentRoot, options.field, incomingDocument);
          }
        });
        lastDocument = serializedIncoming;
      } finally {
        isApplyingLocalUpdate = false;
      }

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
            options.fallbackDocument,
            editorView
          );
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
          (updates) => {
            if (
              updates.every((update) => {
                const source = update[kStorageUpdateSource];
                return source?.origin === "local" && source.via === "mutation";
              })
            ) {
              return;
            }

            applyStorageToEditor(updates);
          },
          {
            isDeep: true,
          }
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
