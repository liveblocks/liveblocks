import { Extension, Mark, mergeAttributes } from "@tiptap/core";
import type { Node } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { ySyncPluginKey } from "y-prosemirror";

import type { CommentsExtensionStorage, ThreadPluginState } from "../types";
import {
  LIVEBLOCKS_COMMENT_MARK_TYPE,
  ThreadPluginActions,
  THREADS_ACTIVE_SELECTION_PLUGIN,
  THREADS_PLUGIN_KEY,
} from "../types";

type ThreadPluginAction = {
  name: ThreadPluginActions;
  data: string | null;
};

/**
 * Known issues: Overlapping marks are merged when reloading the doc. May be related:
 * https://github.com/ueberdosis/tiptap/issues/4339
 * https://github.com/yjs/y-prosemirror/issues/47
 */
const Comment = Mark.create({
  name: LIVEBLOCKS_COMMENT_MARK_TYPE,
  excludes: "",
  inclusive: false,
  keepOnSplit: true,
  parseHTML: () => {
    return [
      {
        tag: "span",
        getAttrs: (node) =>
          node.getAttribute("data-lb-thread-id") !== null && null,
      },
    ];
  },
  addAttributes() {
    // Return an object with attribute configuration
    return {
      orphan: {
        parseHTML: (element) => !!element.getAttribute("data-orphan"),
        renderHTML: (attributes) => {
          return (attributes as { orphan: boolean }).orphan
            ? {
                "data-orphan": "true",
              }
            : {};
        },
        default: false,
      },
      threadId: {
        parseHTML: (element) => element.getAttribute("data-lb-thread-id"),
        renderHTML: (attributes) => {
          return {
            "data-lb-thread-id": (attributes as { threadId: string }).threadId,
          };
        },
        default: "",
      },
    };
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        class: "lb-root lb-tiptap-thread-mark",
      }),
    ];
  },

  /**
   * This plugin tracks the (first) position of each thread mark in the doc and creates a decoration for the selected thread
   */
  addProseMirrorPlugins() {
    const updateState = (doc: Node, selectedThreadId: string | null) => {
      const threadPositions = new Map<string, { from: number; to: number }>();
      const decorations: Decoration[] = [];
      // find all thread marks and store their position + create decoration for selected thread
      doc.descendants((node, pos) => {
        node.marks.forEach((mark) => {
          if (mark.type === this.type) {
            const thisThreadId = (
              mark.attrs as { threadId: string | undefined }
            ).threadId;
            if (!thisThreadId) {
              return;
            }
            const from = pos;
            const to = from + node.nodeSize;

            // FloatingThreads component uses "to" as the position, so always store the largest "to" found
            // AnchoredThreads component uses "from" as the position, so always store the smallest "from" found
            const currentPosition = threadPositions.get(thisThreadId) ?? {
              from: Infinity,
              to: 0,
            };
            threadPositions.set(thisThreadId, {
              from: Math.min(from, currentPosition.from),
              to: Math.max(to, currentPosition.to),
            });

            if (selectedThreadId === thisThreadId) {
              decorations.push(
                Decoration.inline(from, to, {
                  class: "lb-root lb-tiptap-thread-mark-selected",
                })
              );

              const decoration = this.editor.view.dom.querySelector(
                `.lb-tiptap-thread-mark[data-lb-thread-id="${thisThreadId}"]`
              );

              if (decoration) {
                decoration.scrollIntoView({
                  behavior: "smooth",
                  block: "nearest",
                });
              }
            }
          }
        });
      });
      return {
        decorations: DecorationSet.create(doc, decorations),
        selectedThreadId,
        threadPositions,
        selectedThreadPos:
          selectedThreadId !== null
            ? (threadPositions.get(selectedThreadId)?.to ?? null)
            : null,
      };
    };

    return [
      new Plugin({
        key: THREADS_PLUGIN_KEY,
        state: {
          init() {
            return {
              threadPositions: new Map<string, { from: number; to: number }>(),
              selectedThreadId: null,
              selectedThreadPos: null,
              decorations: DecorationSet.empty,
            } as ThreadPluginState;
          },
          apply(tr, state) {
            const action = tr.getMeta(THREADS_PLUGIN_KEY) as ThreadPluginAction;
            if (!tr.docChanged && !action) {
              return state;
            }

            if (!action) {
              // Doc changed, but no action, just update rects
              return updateState(tr.doc, state.selectedThreadId);
            }
            // handle actions, possibly support more actions
            if (
              action.name === ThreadPluginActions.SET_SELECTED_THREAD_ID &&
              state.selectedThreadId !== action.data
            ) {
              return updateState(tr.doc, action.data);
            }

            return state;
          },
        },
        props: {
          decorations: (state) => {
            return (
              THREADS_PLUGIN_KEY.getState(state)?.decorations ??
              DecorationSet.empty
            );
          },
          handleClick: (view, pos, event) => {
            if (event.button !== 0) {
              return;
            }

            const selectThread = (threadId: string | null) => {
              view.dispatch(
                view.state.tr.setMeta(THREADS_PLUGIN_KEY, {
                  name: ThreadPluginActions.SET_SELECTED_THREAD_ID,
                  data: threadId,
                })
              );
            };

            const node = view.state.doc.nodeAt(pos);
            if (!node) {
              selectThread(null);
              return;
            }
            const commentMark = node.marks.find(
              (mark) => mark.type === this.type
            );
            // don't allow selecting orphaned threads
            if (commentMark?.attrs.orphan) {
              selectThread(null);
              return;
            }
            const threadId = commentMark?.attrs.threadId as string | undefined;
            selectThread(threadId ?? null);
          },
        },
      }),
    ];
  },
});

export const CommentsExtension = Extension.create<
  never,
  CommentsExtensionStorage
>({
  name: "liveblocksComments",
  priority: 95,
  addExtensions() {
    return [Comment];
  },

  addStorage() {
    return {
      pendingComment: false,
    };
  },

  addCommands() {
    return {
      addPendingComment: () => () => {
        if (this.editor.state.selection.empty) {
          return false;
        }
        // unselect any open threads
        this.editor.view.dispatch(
          this.editor.state.tr.setMeta(THREADS_PLUGIN_KEY, {
            name: ThreadPluginActions.SET_SELECTED_THREAD_ID,
            data: null,
          })
        );
        this.storage.pendingComment = true;
        return true;
      },
      closePendingComment: () => () => {
        this.storage.pendingComment = false;
        return true;
      },
      selectThread: (id: string | null) => () => {
        this.editor.view.dispatch(
          this.editor.state.tr.setMeta(THREADS_PLUGIN_KEY, {
            name: ThreadPluginActions.SET_SELECTED_THREAD_ID,
            data: id,
          })
        );
        return true;
      },
      addComment:
        (id: string) =>
        ({ commands }) => {
          if (
            !this.storage.pendingComment ||
            this.editor.state.selection.empty
          ) {
            return false;
          }
          commands.setMark(LIVEBLOCKS_COMMENT_MARK_TYPE, { threadId: id });
          this.storage.pendingComment = false;
          return true;
        },
    };
  },

  // @ts-expect-error - this is incorrectly typed upstream in Mark.ts of TipTap. This event does include transaction
  // correct: https://github.com/ueberdosis/tiptap/blob/2ff327ced84df6865b4ef98947b667aa79992292/packages/core/src/types.ts#L60
  // incorrect: https://github.com/ueberdosis/tiptap/blob/2ff327ced84df6865b4ef98947b667aa79992292/packages/core/src/Mark.ts#L330
  onSelectionUpdate(
    this: { storage: CommentsExtensionStorage }, // NOTE: there are more types here I didn't override, this gets removed after submitting PR to tiptap
    { transaction }: { transaction: Transaction } // TODO: remove this after submitting PR to tiptap
  ) {
    // ignore changes made by yjs
    if (!this.storage.pendingComment || transaction.getMeta(ySyncPluginKey)) {
      return;
    }
    // if selection changes, hide the composer. We could keep the composer open and move it to the new selection?
    this.storage.pendingComment = false;
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: THREADS_ACTIVE_SELECTION_PLUGIN,
        props: {
          decorations: ({ doc, selection }) => {
            if (!this.storage.pendingComment) {
              return DecorationSet.create(doc, []);
            }
            const { from, to } = selection;
            const decorations: Decoration[] = [
              Decoration.inline(from, to, {
                class: "lb-root lb-selection lb-tiptap-active-selection",
              }),
            ];
            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});
