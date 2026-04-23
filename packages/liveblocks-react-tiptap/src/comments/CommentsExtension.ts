import { shallow } from "@liveblocks/core";
import { type Editor, Extension, Mark, mergeAttributes } from "@tiptap/core";
import type {
  Mark as ProseMirrorMark,
  MarkType,
  Node,
  ResolvedPos,
} from "@tiptap/pm/model";
import { Fragment, Slice } from "@tiptap/pm/model";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { ySyncPluginKey } from "y-prosemirror";

import type { CommentsExtensionStorage, ThreadPluginState } from "../types";
import {
  LIVEBLOCKS_COMMENT_MARK_TYPE,
  ThreadPluginActions,
  THREADS_ACTIVE_SELECTION_PLUGIN,
  THREADS_PLUGIN_KEY,
} from "../types";
import { areSetsEqual } from "../utils";

type ThreadPluginAction = {
  name: ThreadPluginActions;
  data: string[];
};

export const FILTERED_THREADS_PLUGIN_KEY = new PluginKey<{
  filteredThreads?: Set<string>;
}>();

function getFilteredThreads(state: EditorState): Set<string> | undefined {
  return FILTERED_THREADS_PLUGIN_KEY.getState(state)?.filteredThreads;
}

function getVisibleThreadIdsFromMarks(
  marks: readonly ProseMirrorMark[],
  markType: MarkType,
  filteredThreads: Set<string> | undefined
): string[] {
  const ids = new Set<string>();
  for (const mark of marks) {
    if (mark.type !== markType || mark.attrs.orphan) continue;
    const threadId = mark.attrs.threadId as string | undefined;
    if (!threadId) continue;
    if (filteredThreads && !filteredThreads.has(threadId)) continue;
    ids.add(threadId);
  }
  return [...ids];
}

function getVisibleThreadIdsAtPos(
  state: EditorState,
  $pos: ResolvedPos,
  markType: MarkType
): string[] {
  return getVisibleThreadIdsFromMarks(
    $pos.marks(),
    markType,
    getFilteredThreads(state)
  );
}

function dispatchSetActiveThreadIds(view: EditorView, ids: string[]): void {
  view.dispatch(
    view.state.tr.setMeta(THREADS_PLUGIN_KEY, {
      name: ThreadPluginActions.SET_ACTIVE_THREAD_IDS,
      data: ids,
    } satisfies ThreadPluginAction)
  );
}

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
    const filteredThreads = this.editor
      ? FILTERED_THREADS_PLUGIN_KEY.getState(this.editor.state)?.filteredThreads
      : undefined;
    const threadId = (HTMLAttributes as { ["data-lb-thread-id"]: string })[
      "data-lb-thread-id"
    ];
    if (filteredThreads && !filteredThreads.has(threadId)) {
      return [
        "span",
        mergeAttributes(HTMLAttributes, {
          class: "lb-root lb-tiptap-thread-mark",
          "data-hidden": "",
        }),
      ];
    }

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
    const updateState = (
      doc: Node,
      activeThreadIds: string[],
      { scroll }: { scroll: boolean }
    ): ThreadPluginState => {
      const threadPositions = new Map<string, { from: number; to: number }>();
      const decorations: Decoration[] = [];
      const activeSet = new Set(activeThreadIds);

      doc.descendants((node, pos) => {
        for (const mark of node.marks) {
          if (mark.type !== this.type) continue;

          const threadId = (mark.attrs as { threadId?: string }).threadId;
          if (!threadId) continue;

          const from = pos;
          const to = from + node.nodeSize;

          // FloatingThreads component uses "to" as the position, so we always store the largest "to" found.
          // AnchoredThreads component uses "from" as the position, so we always store the smallest "from" found.
          const current = threadPositions.get(threadId) ?? {
            from: Infinity,
            to: 0,
          };
          threadPositions.set(threadId, {
            from: Math.min(from, current.from),
            to: Math.max(to, current.to),
          });

          if (activeSet.has(threadId)) {
            decorations.push(
              Decoration.inline(from, to, {
                class: "lb-root lb-tiptap-thread-mark-selected",
              })
            );
          }
        }
      });

      // Only scroll when the active selection explicitly changes.
      if (scroll && activeThreadIds.length > 0) {
        const [scrollTargetId] = activeThreadIds;
        const element = this.editor.view.dom.querySelector(
          `.lb-tiptap-thread-mark[data-lb-thread-id="${scrollTargetId}"]`
        );
        element?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }

      return {
        decorations: DecorationSet.create(doc, decorations),
        activeThreadIds,
        threadPositions,
      };
    };

    // Recursively walks a Fragment and removes only this extension's comment mark from every node it finds.
    const stripCommentMarks = (slice: Slice): Slice => {
      const stripFragment = (fragment: Fragment): Fragment => {
        let changed = false;
        const nodes: Node[] = [];

        fragment.forEach((node) => {
          // Filter out this extension's comment mark from the node's marks so that it is not copied to the clipboard
          const nextMarks = node.marks.filter(
            (mark) => mark.type !== this.type
          );
          const marksChanged = nextMarks.length !== node.marks.length;

          // Recursively strip comment marks from child content (e.g. inline content inside paragraphs, list items)
          const nextContent =
            node.content.childCount > 0
              ? stripFragment(node.content)
              : node.content;
          const contentChanged = nextContent !== node.content;

          if (marksChanged || contentChanged) {
            changed = true;
            nodes.push(
              node.isText
                ? node.mark(nextMarks)
                : node.type.create(node.attrs, nextContent, nextMarks)
            );
          } else {
            nodes.push(node);
          }
        });

        return changed ? Fragment.fromArray(nodes) : fragment;
      };

      const content = stripFragment(slice.content);
      return content === slice.content
        ? slice
        : new Slice(content, slice.openStart, slice.openEnd);
    };

    return [
      new Plugin({
        key: new PluginKey("lb-comment-clipboard"),
        props: {
          transformCopied: (slice) => stripCommentMarks(slice),
          transformPasted: (slice) => stripCommentMarks(slice),
        },
      }),
      new Plugin({
        key: THREADS_PLUGIN_KEY,
        state: {
          init(): ThreadPluginState {
            return {
              threadPositions: new Map(),
              activeThreadIds: [],
              decorations: DecorationSet.empty,
            };
          },
          apply(tr, state) {
            const action = tr.getMeta(THREADS_PLUGIN_KEY) as
              | ThreadPluginAction
              | undefined;

            if (!tr.docChanged && !action) {
              return state;
            }

            if (!action) {
              return updateState(tr.doc, state.activeThreadIds, {
                scroll: false,
              });
            }

            if (action.name === ThreadPluginActions.SET_ACTIVE_THREAD_IDS) {
              const idsChanged = !shallow(action.data, state.activeThreadIds);
              if (!tr.docChanged && !idsChanged) {
                return state;
              }
              return updateState(tr.doc, action.data, { scroll: idsChanged });
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
            if (event.button !== 0) return;

            const $pos = view.state.doc.resolve(pos);
            const ids = getVisibleThreadIdsAtPos(view.state, $pos, this.type);
            dispatchSetActiveThreadIds(view, ids);
          },
        },
      }),
    ];
  },
});

export const CommentsExtension = Extension.create<
  { filteredThreads?: Set<string> },
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
        // Unselect any open threads.
        dispatchSetActiveThreadIds(this.editor.view, []);
        this.storage.pendingComment = true;
        return true;
      },
      closePendingComment: () => () => {
        this.storage.pendingComment = false;
        return true;
      },
      selectThread: (id: string | null) => () => {
        // If the target thread is filtered out, clear the active selection
        // instead of selecting an invisible thread.
        const filtered = getFilteredThreads(this.editor.state);
        const nextIds =
          id === null || (filtered && !filtered.has(id)) ? [] : [id];

        dispatchSetActiveThreadIds(this.editor.view, nextIds);
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
  onSelectionUpdate(
    this: { storage: CommentsExtensionStorage; editor: Editor },
    { transaction }: { transaction: Transaction }
  ) {
    // Close any pending composer when the user moves the selection locally
    // (but ignore remote Yjs-driven selection changes).
    if (this.storage.pendingComment && !transaction.getMeta(ySyncPluginKey)) {
      this.storage.pendingComment = false;
    }

    if (this.storage.pendingComment) return;

    const { state } = this.editor;
    const markType = state.schema.marks[LIVEBLOCKS_COMMENT_MARK_TYPE];
    if (!markType) return;

    const ids = getVisibleThreadIdsAtPos(
      state,
      state.selection.$from,
      markType
    );
    const current = THREADS_PLUGIN_KEY.getState(state)?.activeThreadIds ?? [];
    if (shallow(ids, current)) return;

    dispatchSetActiveThreadIds(this.editor.view, ids);
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
      new Plugin({
        key: FILTERED_THREADS_PLUGIN_KEY,
        state: {
          init: () => ({
            filteredThreads: this.options.filteredThreads,
          }),
          apply(tr, value) {
            const meta = tr.getMeta(FILTERED_THREADS_PLUGIN_KEY) as
              | { filteredThreads?: Set<string> }
              | undefined;
            if (meta?.filteredThreads) {
              return { filteredThreads: meta.filteredThreads };
            }
            return value;
          },
        },
        view: (view) => {
          const syncDom = () => {
            const filteredThreads = FILTERED_THREADS_PLUGIN_KEY.getState(
              view.state
            )?.filteredThreads;

            // Toggle attribute for all comment-mark spans
            const els = view.dom.querySelectorAll<HTMLElement>(
              "span.lb-tiptap-thread-mark[data-lb-thread-id]"
            );
            els.forEach((el) => {
              const id = el.getAttribute("data-lb-thread-id");
              if (!id) return;
              if (!filteredThreads || filteredThreads.has(id)) {
                el.removeAttribute("data-hidden");
              } else {
                el.setAttribute("data-hidden", "");
              }
            });
          };

          queueMicrotask(syncDom);

          return {
            update: (view, prevState) => {
              const curr = FILTERED_THREADS_PLUGIN_KEY.getState(
                view.state
              )?.filteredThreads;
              const prev =
                FILTERED_THREADS_PLUGIN_KEY.getState(
                  prevState
                )?.filteredThreads;

              if (
                !areSetsEqual(prev, curr) ||
                view.state.doc !== prevState.doc
              ) {
                syncDom();

                const active =
                  THREADS_PLUGIN_KEY.getState(view.state)?.activeThreadIds ??
                  [];

                if (active.length && curr) {
                  const next = active.filter((id) => curr.has(id));
                  if (next.length !== active.length) {
                    dispatchSetActiveThreadIds(view, next);
                  }
                }
              }
            },
          };
        },
      }),
    ];
  },
});
