import { useClient, useRoom } from "@liveblocks/react";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import { Extension, mergeAttributes, Mark } from "@tiptap/core";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { Doc } from "yjs";
import {
  Plugin,
  PluginKey,
  SelectionBookmark,
  TextSelection,
} from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { ySyncPluginKey } from "y-prosemirror";
import MentionPlugin from "./MentionPlugin";
import { Node } from "@tiptap/pm/model";

const providersMap = new Map<
  string,
  LiveblocksYjsProvider<any, any, any, any, any>
>();

const docMap = new Map<string, Doc>();

type LiveblocksExtensionOptions = {
  field?: string;
};

export const ACTIVE_SELECTION_PLUGIN = new PluginKey(
  "lb-active-selection-plugin"
);
export const THREADS_PLUGIN_KEY = new PluginKey("lb-threads-plugin");

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    comments: {
      /**
       * Add a comment
       */
      addComment: (id: string) => ReturnType;
    };

    liveblocks: {
      addPendingComment: () => ReturnType;
    };
  }
}

export type ThreadPluginState = {
  threadPositions: Map<string, { from: number; to: number }>;
  selectedThreadId: string | null;
  selectedThreadPos: number | null;
  decorations: DecorationSet;
};

export const enum ThreadPluginActions {
  SET_SELECTED_THREAD_ID = "SET_SELECTED_THREAD_ID",
}

/**
 * Known issues: Overlapping marks are merged when reloading the doc. May be related:
 * https://github.com/ueberdosis/tiptap/issues/4339
 * https://github.com/yjs/y-prosemirror/issues/47
 */
const Comment = Mark.create({
  name: "liveblocksComments",
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
      addComment:
        (id: string) =>
        ({ commands }) => {
          if (
            !this.editor.storage.liveblocksExtension.pendingCommentSelection
          ) {
            return false;
          }
          this.editor.state.selection = this.editor.storage.liveblocksExtension
            .pendingCommentSelection as TextSelection;
          commands.setMark(this.type, { threadId: id });
          this.editor.storage.liveblocksExtension.pendingCommentSelection =
            null;

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
              return false;
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
});

const LiveblocksCollab = Collaboration.extend({
  // Override the onCreate method to warn users about potential misconfigurations
  onCreate() {
    if (
      !this.editor.extensionManager.extensions.find((e) => e.name === "doc")
    ) {
      console.warn(
        "[Liveblocks] The tiptap document extension is required for Liveblocks collaboration. Please add it or use Tiptap StarterKit extension."
      );
    }
    if (
      !this.editor.extensionManager.extensions.find(
        (e) => e.name === "paragraph"
      )
    ) {
      console.warn(
        "[Liveblocks] The tiptap paragraph extension is required for Liveblocks collaboration. Please add it or use Tiptap StarterKit extension."
      );
    }

    if (
      !this.editor.extensionManager.extensions.find((e) => e.name === "text")
    ) {
      console.warn(
        "[Liveblocks] The tiptap text extension is required for Liveblocks collaboration. Please add it or use Tiptap StarterKit extension."
      );
    }
    if (
      this.editor.extensionManager.extensions.find((e) => e.name === "history")
    ) {
      console.warn(
        "[Liveblocks] The history extension is enabled, Liveblocks extension provides its own. Please remove or disable the History plugin to prevent unwanted conflicts."
      );
    }
  },
});

// TODO: move options to `addOptions` of the extension itself
// TODO: add option to disable mentions
// TODO: add option to disable comments
export const useLiveblocksExtension = ({
  field,
}: LiveblocksExtensionOptions = {}): Extension => {
  const client = useClient();
  const room = useRoom();

  return Extension.create({
    name: "liveblocksExtension",

    // @ts-ignore I have no idea why TS doesn't like this
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
    onCreate() {
      if (
        this.editor.extensionManager.extensions.find(
          (e) => e.name.toLowerCase() === "mention"
        )
      ) {
        console.warn(
          "[Liveblocks] Liveblocks contains its own mention plugin, using another mention plugin may cause a conflict."
        );
      }
      const self = room.getSelf();
      if (self?.info) {
        this.editor.commands.updateUser({
          name: self.info.name,
          color: self.info.color,
        });
      }
      this.storage.unsub = room.events.self.subscribe(({ info }) => {
        // TODO: maybe we need a deep compare here so other info can be provided
        const { name, color } = info;
        const { user } = this.storage.provider.awareness.getLocalState();
        if (name != user?.name || color != user?.color) {
          this.editor.commands.updateUser({ name, color });
        }
      });
    },
    onDestroy() {
      this.storage.unsub();
    },
    addStorage() {
      if (!providersMap.has(room.id)) {
        const doc = new Doc();
        docMap.set(room.id, doc);
        providersMap.set(room.id, new LiveblocksYjsProvider(room as any, doc));
      }
      return {
        doc: docMap.get(room.id),
        provider: providersMap.get(room.id),
        unsub: () => {},
        pendingCommentSelection: null,
      };
    },
    addExtensions() {
      const options = field !== undefined ? { field } : {};
      return [
        Comment,
        LiveblocksCollab.configure({
          document: this.storage.doc,
          ...options,
        }),
        CollaborationCursor.configure({
          provider: this.storage.provider, //todo change the ! to an assert
        }),
        MentionPlugin,
      ];
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
};
