import {
  EditorSelection,
  type Extension,
  type Range,
  RangeSetBuilder,
  StateEffect,
  StateField,
  Transaction,
} from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import { LiveObject, type Room } from "@liveblocks/client";
import { LiveText, type LiveTextData } from "@liveblocks/core";

export const LIVEBLOCKS_COMMENT_ATTR = "threadId";
export const LIVEBLOCKS_COMMENT_ORPHAN_ATTR = "commentOrphan";

export type CommentRange = {
  from: number;
  to: number;
  threadId: string;
  orphan: boolean;
};

type PendingCommentRange = {
  from: number;
  to: number;
};

type CommentPluginState = {
  ranges: CommentRange[];
  decorations: DecorationSet;
  activeThreadIds: string[];
  pendingRange: PendingCommentRange | null;
  visibleThreadIds: Set<string> | null;
};

export const setCommentRanges = StateEffect.define<CommentRange[]>();
export const setActiveThreadIds = StateEffect.define<string[]>();
export const setPendingCommentRange =
  StateEffect.define<PendingCommentRange | null>();
export const setVisibleThreadIds = StateEffect.define<Set<string> | null>();

export const liveblocksCommentStateField =
  StateField.define<CommentPluginState>({
    create(state) {
      return {
        ranges: [],
        decorations: buildCommentDecorations(state.doc.length, [], [], null),
        activeThreadIds: [],
        pendingRange: null,
        visibleThreadIds: null,
      };
    },
    update(value, tr) {
      let ranges = value.ranges;
      let activeThreadIds = value.activeThreadIds;
      let pendingRange = value.pendingRange;
      let visibleThreadIds = value.visibleThreadIds;
      let shouldRebuild = false;

      if (tr.docChanged) {
        ranges = ranges
          .map((range) => ({
            ...range,
            from: tr.changes.mapPos(range.from, 1),
            to: tr.changes.mapPos(range.to, -1),
          }))
          .filter((range) => range.from < range.to);
        pendingRange =
          pendingRange === null
            ? null
            : {
                from: tr.changes.mapPos(pendingRange.from, 1),
                to: tr.changes.mapPos(pendingRange.to, -1),
              };
        if (pendingRange !== null && pendingRange.from >= pendingRange.to) {
          pendingRange = null;
        }
        shouldRebuild = true;
      }

      for (const effect of tr.effects) {
        if (effect.is(setCommentRanges)) {
          ranges = effect.value;
          shouldRebuild = true;
        } else if (effect.is(setActiveThreadIds)) {
          activeThreadIds = effect.value;
          shouldRebuild = true;
        } else if (effect.is(setPendingCommentRange)) {
          pendingRange = effect.value;
          shouldRebuild = true;
        } else if (effect.is(setVisibleThreadIds)) {
          visibleThreadIds = effect.value;
          shouldRebuild = true;
        }
      }

      if (tr.selection || tr.docChanged) {
        const nextActiveThreadIds = getThreadIdsForSelection(
          ranges,
          tr.newSelection.main
        );
        if (!arraysEqual(nextActiveThreadIds, activeThreadIds)) {
          activeThreadIds = nextActiveThreadIds;
          shouldRebuild = true;
        }
      }

      if (!shouldRebuild) {
        return value;
      }

      return {
        ranges,
        decorations: buildCommentDecorations(
          tr.newDoc.length,
          ranges,
          activeThreadIds,
          pendingRange,
          visibleThreadIds
        ),
        activeThreadIds,
        pendingRange,
        visibleThreadIds,
      };
    },
    provide: (field) =>
      EditorView.decorations.from(field, (state) => state.decorations),
  });

type PendingCommentFormat = {
  index: number;
  length: number;
  threadId: string;
};

/**
 * Preserves LiveText comment attributes when typing inside an existing comment
 * range. Register immediately before `@liveblocks/codemirror`'s sync plugin.
 */
export function createLiveblocksCommentFormatPreservationPlugin(
  room: Room,
  root: LiveObject<{ document: LiveText }>
): Extension {
  return ViewPlugin.fromClass(
    class {
      private isDestroyed = false;

      constructor(_view: EditorView) {}

      update(update: ViewUpdate) {
        if (
          update.transactions.some((tr) => tr.annotation(Transaction.remote))
        ) {
          return;
        }

        if (!update.docChanged) return;

        const text = root.get("document");
        const pending: PendingCommentFormat[] = [];
        let offset = 0;

        update.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
          const deleteLength = toA - fromA;
          const insertText = inserted.toString();
          const index = fromA + offset;

          if (insertText.length > 0) {
            const threadId = getThreadIdForEdit(text, index, deleteLength);
            if (threadId !== null) {
              pending.push({
                index,
                length: insertText.length,
                threadId,
              });
            }
          }

          offset += insertText.length - deleteLength;
        });

        if (pending.length === 0) return;

        queueMicrotask(() => {
          if (this.isDestroyed) return;

          const document = root.get("document");
          room.batch(() => {
            for (const { index, length, threadId } of pending) {
              document.format(index, length, {
                [LIVEBLOCKS_COMMENT_ATTR]: threadId,
                [LIVEBLOCKS_COMMENT_ORPHAN_ATTR]: null,
              });
            }
          });
        });
      }

      destroy() {
        this.isDestroyed = true;
      }
    }
  );
}

export function createLiveblocksCommentsPlugin(
  room: Room,
  root: LiveObject<{ document: LiveText }>
): Extension[] {
  const document = root.get("document");

  return [
    liveblocksCommentStateField,
    EditorView.domEventHandlers({
      mousedown(event, view) {
        const target = event.target;
        if (!(target instanceof Element)) return false;

        const mark = target.closest<HTMLElement>(".lb-cm-thread-mark");
        const threadId = mark?.dataset.lbThreadId;
        if (threadId === undefined) return false;

        const range = getCommentPluginState(view)?.ranges.find(
          (range) => range.threadId === threadId
        );
        if (range === undefined) return false;

        event.preventDefault();
        view.dispatch({
          selection: EditorSelection.single(range.from, range.to),
          effects: setActiveThreadIds.of([threadId]),
        });
        view.focus();
        return true;
      },
    }),
    ViewPlugin.fromClass(
      class {
        private unsubscribeFromStorageUpdates: () => void;
        private isDestroyed = false;
        private hasPendingRefresh = false;

        constructor(private view: EditorView) {
          this.refreshCommentRanges();

          this.unsubscribeFromStorageUpdates = room.subscribe(
            root,
            (updates) => {
              for (const update of updates) {
                if (update.type !== "LiveText" || update.node !== document) {
                  continue;
                }

                this.refreshCommentRanges();
                break;
              }
            },
            { isDeep: true }
          );
        }

        destroy() {
          this.isDestroyed = true;
          this.unsubscribeFromStorageUpdates();
        }

        private refreshCommentRanges() {
          if (this.hasPendingRefresh) return;

          this.hasPendingRefresh = true;
          queueMicrotask(() => {
            this.hasPendingRefresh = false;
            if (this.isDestroyed) return;

            this.view.dispatch({
              effects: setCommentRanges.of(getCommentRanges(document)),
            });
          });
        }
      }
    ),
  ];
}

export function getCommentRanges(document: LiveText): CommentRange[] {
  return getCommentRangesFromData(document.toJSON());
}

export function getCommentRangesFromData(data: LiveTextData): CommentRange[] {
  const ranges: CommentRange[] = [];
  let offset = 0;

  for (const [text, attributes] of data) {
    const threadId = attributes?.[LIVEBLOCKS_COMMENT_ATTR];
    const orphan = attributes?.[LIVEBLOCKS_COMMENT_ORPHAN_ATTR];
    const length = text.length;

    if (typeof threadId === "string" && length > 0) {
      const previous = ranges.at(-1);
      if (
        previous !== undefined &&
        previous.threadId === threadId &&
        previous.orphan === (orphan === true) &&
        previous.to === offset
      ) {
        previous.to += length;
      } else {
        ranges.push({
          from: offset,
          to: offset + length,
          threadId,
          orphan: orphan === true,
        });
      }
    }

    offset += length;
  }

  return ranges;
}

export function attachThreadToSelection(
  view: EditorView,
  root: LiveObject<{ document: LiveText }>,
  threadId: string
): boolean {
  const pendingRange = getCommentPluginState(view)?.pendingRange;
  const selection = view.state.selection.main;
  const from =
    pendingRange?.from ?? Math.min(selection.anchor, selection.head);
  const to = pendingRange?.to ?? Math.max(selection.anchor, selection.head);

  if (from === to) return false;

  root.get("document").format(from, to - from, {
    [LIVEBLOCKS_COMMENT_ATTR]: threadId,
    [LIVEBLOCKS_COMMENT_ORPHAN_ATTR]: null,
  });

  view.dispatch({
    effects: [
      setPendingCommentRange.of(null),
      setActiveThreadIds.of([threadId]),
    ],
  });

  return true;
}

export function removeDeletedCommentThreadFormatting(
  root: LiveObject<{ document: LiveText }>,
  existingThreadIds: ReadonlySet<string>
): boolean {
  const document = root.get("document");
  const ranges = getCommentRanges(document).filter(
    (range) => !existingThreadIds.has(range.threadId)
  );

  for (const range of ranges) {
    document.format(range.from, range.to - range.from, {
      [LIVEBLOCKS_COMMENT_ATTR]: null,
      [LIVEBLOCKS_COMMENT_ORPHAN_ATTR]: null,
    });
  }

  return ranges.length > 0;
}

export function openPendingComment(view: EditorView): boolean {
  const selection = view.state.selection.main;
  const from = Math.min(selection.anchor, selection.head);
  const to = Math.max(selection.anchor, selection.head);

  if (from === to) return false;

  view.dispatch({
    effects: setPendingCommentRange.of({ from, to }),
  });

  return true;
}

export function closePendingComment(view: EditorView): void {
  view.dispatch({
    effects: setPendingCommentRange.of(null),
  });
}

export function selectThread(view: EditorView, threadId: string | null): void {
  view.dispatch({
    effects: setActiveThreadIds.of(threadId === null ? [] : [threadId]),
  });
}

export function setVisibleCommentThreads(
  view: EditorView,
  threadIds: Set<string> | null
): void {
  view.dispatch({
    effects: setVisibleThreadIds.of(threadIds),
  });
}

export function getThreadPositions(
  root: LiveObject<{ document: LiveText }>
): Map<string, { from: number; to: number }> {
  const positions = new Map<string, { from: number; to: number }>();

  for (const range of getCommentRanges(root.get("document"))) {
    const current = positions.get(range.threadId);
    if (current === undefined) {
      positions.set(range.threadId, { from: range.from, to: range.to });
    } else {
      positions.set(range.threadId, {
        from: Math.min(current.from, range.from),
        to: Math.max(current.to, range.to),
      });
    }
  }

  return positions;
}

export function getCommentPluginState(
  view: EditorView
): CommentPluginState | null {
  return view.state.field(liveblocksCommentStateField, false) ?? null;
}

export function getThreadIdForEdit(
  document: LiveText,
  index: number,
  deleteLength: number
): string | null {
  const editFrom = index;
  const editTo = index + deleteLength;

  for (const range of getCommentRanges(document)) {
    if (deleteLength > 0) {
      if (range.from < editTo && range.to > editFrom) {
        return range.threadId;
      }
    } else if (range.from <= index && index < range.to) {
      return range.threadId;
    }
  }

  return null;
}

function buildCommentDecorations(
  docLength: number,
  ranges: CommentRange[],
  activeThreadIds: string[],
  pendingRange: PendingCommentRange | null,
  visibleThreadIds: Set<string> | null = null
): DecorationSet {
  const active = new Set(activeThreadIds);
  const builder = new RangeSetBuilder<Decoration>();

  const decorations: Array<Range<Decoration>> = [];
  for (const range of ranges) {
    const from = clamp(range.from, { min: 0, max: docLength });
    const to = clamp(range.to, { min: 0, max: docLength });
    if (from >= to) continue;

    const isOrphan =
      range.orphan ||
      (visibleThreadIds !== null && !visibleThreadIds.has(range.threadId));
    const className = [
      "lb-cm-thread-mark",
      isOrphan ? "lb-cm-thread-mark-orphan" : null,
      active.has(range.threadId) ? "lb-cm-thread-mark-active" : null,
    ]
      .filter(Boolean)
      .join(" ");

    decorations.push(
      Decoration.mark({
        class: className,
        attributes: { "data-lb-thread-id": range.threadId },
      }).range(from, to)
    );
  }

  if (pendingRange !== null) {
    const from = clamp(pendingRange.from, { min: 0, max: docLength });
    const to = clamp(pendingRange.to, { min: 0, max: docLength });
    if (from < to) {
      decorations.push(
        Decoration.mark({ class: "lb-cm-pending-comment" }).range(from, to)
      );
    }
  }

  decorations.sort((left, right) => left.from - right.from || left.to - right.to);

  for (const decoration of decorations) {
    builder.add(decoration.from, decoration.to, decoration.value);
  }

  return builder.finish();
}

function getThreadIdsForSelection(
  ranges: CommentRange[],
  selection: EditorSelection["main"]
): string[] {
  const from = Math.min(selection.anchor, selection.head);
  const to = Math.max(selection.anchor, selection.head);
  const ids = new Set<string>();

  for (const range of ranges) {
    if (from === to) {
      if (range.from <= from && from <= range.to) {
        ids.add(range.threadId);
      }
    } else if (range.from < to && range.to > from) {
      ids.add(range.threadId);
    }
  }

  return [...ids];
}

function arraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function clamp(
  value: number,
  { min, max }: { min: number; max: number }
): number {
  return Math.max(min, Math.min(value, max));
}
