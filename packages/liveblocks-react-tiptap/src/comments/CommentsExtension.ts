import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { mergeAttributes, Mark, Extension } from "@tiptap/core";
import type { Node } from "@tiptap/pm/model";
import { ySyncPluginKey } from "y-prosemirror";

export const THREADS_PLUGIN_KEY = new PluginKey("lb-threads-plugin");
export const ACTIVE_SELECTION_PLUGIN = new PluginKey(
  "lb-active-selection-plugin"
);

export type ThreadPluginState = {
  threadPositions: Map<string, { from: number; to: number }>;
  selectedThreadId: string | null;
  selectedThreadPos: number | null;
  decorations: DecorationSet;
};

export const enum ThreadPluginActions {
  SET_SELECTED_THREAD_ID = "SET_SELECTED_THREAD_ID",
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    comments: {
      /**
       * Add a comment
       */
      addComment: (id: string) => ReturnType;
      selectThread: (id: string | null) => ReturnType;
    };

    liveblocks: {
      addPendingComment: () => ReturnType;
    };
  }
}

/**
 * Known issues: Overlapping marks are merged when reloading the doc. May be related:
 * https://github.com/ueberdosis/tiptap/issues/4339
 * https://github.com/yjs/y-prosemirror/issues/47
 */
const Comment = Mark.create({
  name: "liveblocksCommentMark",
  excludes: "",
  inclusive: false,
  keepOnSplit: true,
  addAttributes() {
    // Return an object with attribute configuration
    return {
      threadId: {
        parseHTML: (element) => element.getAttribute("data-lb-thread-id"),
        renderHTML: (attributes) => {
          return {
            "data-lb-thread-id": attributes.threadId,
          };
        },
        default: "",
      },
    };
  },

  addCommands() {
    return {
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
          if (!this.editor.storage.liveblocksComments.pendingCommentSelection) {
            return false;
          }
          this.editor.state.selection = this.editor.storage.liveblocksComments
            .pendingCommentSelection as TextSelection;
          commands.setMark(this.type, { threadId: id });
          this.editor.storage.liveblocksComments.pendingCommentSelection = null;

          return true;
        },
    };
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        class: "lb-thread-editor",
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
            const thisThreadId = mark.attrs.threadId;
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
                  class: "lb-thread-editor-selected",
                })
              );
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
            ? threadPositions.get(selectedThreadId)?.to ?? null
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
            const action = tr.getMeta(THREADS_PLUGIN_KEY);
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
            return THREADS_PLUGIN_KEY.getState(state).decorations;
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
            const threadId = node.marks.find((mark) => mark.type === this.type)
              ?.attrs.threadId as string | undefined;
            selectThread(threadId ?? null);
          },
        },
      }),
    ];
  },

  //@ts-ignore - this is incorrectly typed upstream in Mark.ts of TipTap. This event does include transaction
  // correct: https://github.com/ueberdosis/tiptap/blob/2ff327ced84df6865b4ef98947b667aa79992292/packages/core/src/types.ts#L60
  // incorrect: https://github.com/ueberdosis/tiptap/blob/2ff327ced84df6865b4ef98947b667aa79992292/packages/core/src/Mark.ts#L330
  onSelectionUpdate({ transaction }) {
    // ignore changes made by yjs
    if (
      !this.storage.pendingCommentSelection ||
      transaction.getMeta(ySyncPluginKey)
    ) {
      return;
    }
    this.storage.pendingCommentSelection = null;
  },
});

export const CommentsExtension = Extension.create({
  name: "liveblocksComments",
  addExtensions() {
    return [Comment];
  },

  addStorage() {
    return {
      pendingCommentSelection: null,
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
        this.storage.pendingCommentSelection = new TextSelection(
          this.editor.state.selection.$anchor,
          this.editor.state.selection.$head
        );
        return true;
      },
    };
  },

  // TODO: this.storage.pendingCommentSelection needs to be a Yjs Relative Position that gets translated back to absolute position.
  // Commit: eba949d32d6010a3d8b3f7967d73d4deb015b02a has code that can help with this.
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: ACTIVE_SELECTION_PLUGIN,
        props: {
          decorations: ({ doc }) => {
            const active = this.storage.pendingCommentSelection != null;
            if (!active) {
              return DecorationSet.create(doc, []);
            }
            const { from, to } = this.storage
              .pendingCommentSelection as TextSelection;
            const decorations: Decoration[] = [
              Decoration.inline(from, to, {
                class: "lb-editor-active-selection",
              }),
            ];
            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});
