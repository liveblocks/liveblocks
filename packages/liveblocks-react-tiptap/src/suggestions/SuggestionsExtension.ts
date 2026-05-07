import { Extension, Mark, mergeAttributes } from "@tiptap/core";
import {
  Fragment,
  type Mark as ProseMirrorMark,
  type Node,
  Slice,
} from "@tiptap/pm/model";
import {
  type EditorState,
  TextSelection,
  type Transaction,
} from "@tiptap/pm/state";
import { Plugin } from "@tiptap/pm/state";
import { Mapping, type Step, Transform } from "@tiptap/pm/transform";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import { ySyncPluginKey } from "y-prosemirror";

import type {
  SuggestionMarkAttributes,
  SuggestionMode,
  SuggestionRange,
  SuggestionsExtensionStorage,
  SuggestionsPluginState,
} from "../types";
import {
  LIVEBLOCKS_SUGGESTION_MARK_TYPE,
  SUGGESTIONS_PLUGIN_KEY,
  SUGGESTIONS_TRANSACTION_KEY,
} from "../types";

type ReplaceLikeStep = Step & {
  from: number;
  to: number;
  slice: Slice;
};

type ReplaceAroundLikeStep = ReplaceLikeStep & {
  gapFrom: number;
  gapTo: number;
};

type SuggestionsPluginMeta = {
  mode?: SuggestionMode;
  activeSuggestionId?: string | null;
  hoveredSuggestionId?: string | null;
};

type SuggestionsTransactionMeta = {
  skipSuggestionOperation?: boolean;
};

export type SuggestionsExtensionOptions = {
  initialMode: SuggestionMode;
  createSuggestionId: () => string;
  getUserId: () => string;
};

const DEFAULT_USER_ID = "anonymous";
const SUGGESTION_DELETE_PLACEHOLDER = "\u200B";

function createDefaultSuggestionId(): string {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

function isReplaceLikeStep(step: Step): step is ReplaceLikeStep {
  return "from" in step && "to" in step && "slice" in step;
}

function isReplaceAroundLikeStep(
  step: ReplaceLikeStep
): step is ReplaceAroundLikeStep {
  return "gapFrom" in step && "gapTo" in step;
}

function isSuggestionKind(kind: unknown): kind is SuggestionMarkAttributes["kind"] {
  return kind === "insert" || kind === "delete";
}

export function getSuggestionMarkAttributes(
  mark: ProseMirrorMark
): SuggestionMarkAttributes | null {
  const attrs = mark.attrs;

  if (
    mark.type.name !== LIVEBLOCKS_SUGGESTION_MARK_TYPE ||
    typeof attrs.suggestionId !== "string" ||
    typeof attrs.userId !== "string" ||
    !isSuggestionKind(attrs.kind) ||
    typeof attrs.createdAt !== "string" ||
    (attrs.isBlockPlaceholder !== undefined &&
      typeof attrs.isBlockPlaceholder !== "boolean")
  ) {
    return null;
  }

  return {
    suggestionId: attrs.suggestionId,
    userId: attrs.userId,
    kind: attrs.kind,
    createdAt: attrs.createdAt,
    isBlockPlaceholder:
      typeof attrs.isBlockPlaceholder === "boolean"
        ? attrs.isBlockPlaceholder
        : undefined,
  };
}

function findSuggestionMark(
  marks: readonly ProseMirrorMark[],
  predicate?: (attrs: SuggestionMarkAttributes) => boolean
): ProseMirrorMark | null {
  for (const mark of marks) {
    const attrs = getSuggestionMarkAttributes(mark);
    if (attrs && (!predicate || predicate(attrs))) {
      return mark;
    }
  }

  return null;
}

function findInsertionSuggestionMarkAround(
  doc: Node,
  pos: number,
  userId: string
): ProseMirrorMark | null {
  const $pos = doc.resolve(Math.min(pos, doc.content.size));
  const isReusableInsertion = (attrs: SuggestionMarkAttributes) =>
    attrs.kind === "insert" && attrs.userId === userId;

  return (
    findSuggestionMark($pos.marks(), isReusableInsertion) ??
    findSuggestionMark($pos.nodeBefore?.marks ?? [], isReusableInsertion) ??
    findSuggestionMark($pos.nodeAfter?.marks ?? [], isReusableInsertion)
  );
}

function findDeleteSuggestionMarkAround(
  doc: Node,
  from: number,
  to: number,
  userId: string
): ProseMirrorMark | null {
  const $from = doc.resolve(Math.min(from, doc.content.size));
  const $to = doc.resolve(Math.min(to, doc.content.size));
  const isReusableDeletion = (attrs: SuggestionMarkAttributes) =>
    attrs.kind === "delete" && attrs.userId === userId;

  return (
    findSuggestionMark($from.marks(), isReusableDeletion) ??
    findSuggestionMark($from.nodeBefore?.marks ?? [], isReusableDeletion) ??
    findSuggestionMark($from.nodeAfter?.marks ?? [], isReusableDeletion) ??
    findSuggestionMark($to.marks(), isReusableDeletion) ??
    findSuggestionMark($to.nodeBefore?.marks ?? [], isReusableDeletion) ??
    findSuggestionMark($to.nodeAfter?.marks ?? [], isReusableDeletion)
  );
}

function sliceHasSuggestionMark(slice: Slice): boolean {
  let found = false;

  slice.content.nodesBetween(0, slice.content.size, (node) => {
    if (findSuggestionMark(node.marks)) {
      found = true;
      return false;
    }

    return undefined;
  });

  return found;
}

function sliceHasInlineContent(slice: Slice): boolean {
  let found = false;

  slice.content.nodesBetween(0, slice.content.size, (node) => {
    if (node.isInline) {
      found = true;
      return false;
    }

    return undefined;
  });

  return found;
}

function addDeletionPlaceholdersToSlice(
  slice: Slice,
  doc: Node,
  mark: ProseMirrorMark
): Slice {
  const addPlaceholdersToFragment = (fragment: Fragment): Fragment => {
    const nodes: Node[] = [];

    fragment.forEach((node) => {
      if (node.isText) {
        nodes.push(node);
        return;
      }

      if (node.isTextblock && node.content.size === 0) {
        nodes.push(
          node.type.create(
            node.attrs,
            doc.type.schema.text(SUGGESTION_DELETE_PLACEHOLDER, [mark]),
            node.marks
          )
        );
        return;
      }

      nodes.push(
        node.type.create(
          node.attrs,
          node.content.childCount > 0
            ? addPlaceholdersToFragment(node.content)
            : node.content,
          node.marks
        )
      );
    });

    return Fragment.fromArray(nodes);
  };

  return new Slice(
    addPlaceholdersToFragment(slice.content),
    slice.openStart,
    slice.openEnd
  );
}

function isBlockPlaceholderSuggestion(doc: Node, range: SuggestionRange): boolean {
  let found = false;

  doc.nodesBetween(range.from, range.to, (node) => {
    const mark = findSuggestionMark(
      node.marks,
      (attrs) =>
        attrs.suggestionId === range.suggestionId &&
        attrs.kind === "delete" &&
        attrs.isBlockPlaceholder === true
    );

    if (mark && node.text === SUGGESTION_DELETE_PLACEHOLDER) {
      found = true;
      return false;
    }

    return undefined;
  });

  return found;
}

function getBlockPlaceholderDeleteRange(
  doc: Node,
  from: number
): { from: number; to: number } {
  const $from = doc.resolve(from);

  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);

    if (
      node.type.name === "listItem" &&
      node.textContent === SUGGESTION_DELETE_PLACEHOLDER
    ) {
      if (depth > 1) {
        const parent = $from.node(depth - 1);
        if (
          (parent.type.name === "bulletList" ||
            parent.type.name === "orderedList") &&
          parent.childCount === 1
        ) {
          return { from: $from.before(depth - 1), to: $from.after(depth - 1) };
        }
      }

      return { from: $from.before(depth), to: $from.after(depth) };
    }
  }

  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);

    if (node.isTextblock && node.textContent === SUGGESTION_DELETE_PLACEHOLDER) {
      return { from: $from.before(depth), to: $from.after(depth) };
    }
  }

  return { from, to: from + SUGGESTION_DELETE_PLACEHOLDER.length };
}

export function collectSuggestionRanges(doc: Node): SuggestionRange[] {
  const ranges: SuggestionRange[] = [];

  doc.descendants((node, pos) => {
    if (!node.isInline) {
      return;
    }

    for (const mark of node.marks) {
      const attrs = getSuggestionMarkAttributes(mark);
      if (!attrs) {
        continue;
      }

      const previous = ranges[ranges.length - 1];
      const to = pos + node.nodeSize;

      if (
        previous &&
        previous.to === pos &&
        previous.suggestionId === attrs.suggestionId &&
        previous.kind === attrs.kind &&
        previous.userId === attrs.userId
      ) {
        previous.to = to;
      } else {
        ranges.push({
          ...attrs,
          from: pos,
          to,
        });
      }
    }
  });

  return ranges;
}

function createDecorations(
  doc: Node,
  suggestions: SuggestionRange[],
  activeSuggestionId: string | null,
  hoveredSuggestionId: string | null
): DecorationSet {
  const selectedId = hoveredSuggestionId ?? activeSuggestionId;
  if (!selectedId) {
    return DecorationSet.empty;
  }

  const decorations = suggestions
    .filter((suggestion) => suggestion.suggestionId === selectedId)
    .map((suggestion) =>
      Decoration.inline(suggestion.from, suggestion.to, {
        class: "lb-root lb-tiptap-suggestion-selected",
      })
    );

  return DecorationSet.create(doc, decorations);
}

function createPluginState(
  doc: Node,
  mode: SuggestionMode,
  activeSuggestionId: string | null,
  hoveredSuggestionId: string | null
): SuggestionsPluginState {
  const suggestions = collectSuggestionRanges(doc);
  const suggestionIds = new Set(
    suggestions.map((suggestion) => suggestion.suggestionId)
  );
  const nextActiveSuggestionId =
    activeSuggestionId && suggestionIds.has(activeSuggestionId)
      ? activeSuggestionId
      : null;
  const nextHoveredSuggestionId =
    hoveredSuggestionId && suggestionIds.has(hoveredSuggestionId)
      ? hoveredSuggestionId
      : null;

  return {
    mode,
    activeSuggestionId: nextActiveSuggestionId,
    hoveredSuggestionId: nextHoveredSuggestionId,
    suggestions,
    decorations: createDecorations(
      doc,
      suggestions,
      nextActiveSuggestionId,
      nextHoveredSuggestionId
    ),
  };
}

function hasOwnProperty<K extends PropertyKey>(
  value: object,
  key: K
): value is Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function getAddedSliceSize(step: ReplaceLikeStep): number {
  if (isReplaceAroundLikeStep(step)) {
    return step.gapTo - step.gapFrom + step.slice.content.size;
  }

  return step.slice.content.size;
}

function mapStepPositionToNewDoc(
  transactions: readonly Transaction[],
  transactionIndex: number,
  stepIndex: number,
  pos: number,
  assoc: number
): number {
  const mapping = new Mapping();

  transactions.slice(transactionIndex).forEach((transaction, index) => {
    const startStep = index === 0 ? stepIndex : 0;
    transaction.steps.slice(startStep).forEach((step) => {
      mapping.appendMap(step.getMap());
    });
  });

  return mapping.map(pos, assoc);
}

function createSuggestionMark(
  state: EditorState,
  attrs: SuggestionMarkAttributes
): ProseMirrorMark | null {
  const markType = state.schema.marks[LIVEBLOCKS_SUGGESTION_MARK_TYPE];
  return markType ? markType.create(attrs) : null;
}

function getSuggestionIdFromEvent(event: Event): string | null {
  const target = event.target;
  if (!(target instanceof Element)) {
    return null;
  }

  return target
    .closest("[data-lb-suggestion-id]")
    ?.getAttribute("data-lb-suggestion-id") ?? null;
}

function dispatchSuggestionMeta(
  view: EditorView,
  meta: SuggestionsPluginMeta
): void {
  const state = SUGGESTIONS_PLUGIN_KEY.getState(view.state);

  if (
    (!hasOwnProperty(meta, "activeSuggestionId") ||
      meta.activeSuggestionId === state?.activeSuggestionId) &&
    (!hasOwnProperty(meta, "hoveredSuggestionId") ||
      meta.hoveredSuggestionId === state?.hoveredSuggestionId) &&
    (!hasOwnProperty(meta, "mode") || meta.mode === state?.mode)
  ) {
    return;
  }

  view.dispatch(view.state.tr.setMeta(SUGGESTIONS_PLUGIN_KEY, meta));
}

function processSuggestionRanges(
  tr: Transaction,
  state: EditorState,
  suggestionId: string | null,
  acceptOrReject: "accept" | "reject"
): boolean {
  const markType = state.schema.marks[LIVEBLOCKS_SUGGESTION_MARK_TYPE];
  if (!markType) {
    return false;
  }

  const suggestions = collectSuggestionRanges(state.doc)
    .filter(
      (suggestion) =>
        suggestionId === null || suggestion.suggestionId === suggestionId
    )
    .sort((a, b) => b.from - a.from);

  if (suggestions.length === 0) {
    return false;
  }

  tr.setMeta(SUGGESTIONS_TRANSACTION_KEY, {
    skipSuggestionOperation: true,
  } satisfies SuggestionsTransactionMeta);

  for (const suggestion of suggestions) {
    const from = tr.mapping.map(suggestion.from);
    const to = tr.mapping.map(suggestion.to);
    const mappedSuggestion = { ...suggestion, from, to };
    const isBlockPlaceholder =
      suggestion.kind === "delete" &&
      isBlockPlaceholderSuggestion(tr.doc, mappedSuggestion);
    const shouldDelete =
      (acceptOrReject === "accept" && suggestion.kind === "delete") ||
      (acceptOrReject === "reject" && suggestion.kind === "insert");

    if (shouldDelete) {
      const range = isBlockPlaceholder
        ? getBlockPlaceholderDeleteRange(tr.doc, from)
        : { from, to };
      tr.delete(range.from, range.to);
    } else if (isBlockPlaceholder) {
      tr.delete(from, to);
    } else {
      tr.removeMark(from, to, markType);
    }
  }

  tr.setMeta(SUGGESTIONS_PLUGIN_KEY, {
    activeSuggestionId: null,
    hoveredSuggestionId: null,
  } satisfies SuggestionsPluginMeta);

  return true;
}

export const SuggestionMark = Mark.create({
  name: LIVEBLOCKS_SUGGESTION_MARK_TYPE,
  excludes: "",
  inclusive: false,
  keepOnSplit: true,

  parseHTML: () => [
    {
      tag: "span[data-lb-suggestion-id]",
    },
  ],

  addAttributes() {
    return {
      suggestionId: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-lb-suggestion-id"),
        renderHTML: (attributes) => ({
          "data-lb-suggestion-id": String(attributes.suggestionId),
        }),
      },
      userId: {
        default: DEFAULT_USER_ID,
        parseHTML: (element) => element.getAttribute("data-lb-user-id"),
        renderHTML: (attributes) => ({
          "data-lb-user-id": String(attributes.userId),
        }),
      },
      kind: {
        default: "insert",
        parseHTML: (element) =>
          element.getAttribute("data-lb-suggestion-kind"),
        renderHTML: (attributes) => ({
          "data-lb-suggestion-kind": String(attributes.kind),
        }),
      },
      createdAt: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-lb-created-at"),
        renderHTML: (attributes) => ({
          "data-lb-created-at": String(attributes.createdAt),
        }),
      },
      isBlockPlaceholder: {
        default: false,
        parseHTML: (element) =>
          element.getAttribute("data-lb-suggestion-placeholder") === "true",
        renderHTML: (attributes) =>
          attributes.isBlockPlaceholder
            ? { "data-lb-suggestion-placeholder": "true" }
            : {},
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const kindAttribute: unknown = HTMLAttributes["data-lb-suggestion-kind"];
    const kind = typeof kindAttribute === "string" ? kindAttribute : undefined;
    const kindClass =
      kind === "insert" || kind === "delete"
        ? `lb-tiptap-suggestion-${kind}`
        : undefined;

    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        class: ["lb-root", "lb-tiptap-suggestion", kindClass]
          .filter(Boolean)
          .join(" "),
      }),
      0,
    ];
  },
});

export const SuggestionsExtension = Extension.create<
  SuggestionsExtensionOptions,
  SuggestionsExtensionStorage
>({
  name: "liveblocksSuggestions",
  priority: 94,

  addOptions() {
    return {
      initialMode: "editing",
      createSuggestionId: createDefaultSuggestionId,
      getUserId: () => DEFAULT_USER_ID,
    };
  },

  addStorage() {
    return {
      mode: this.options.initialMode,
    };
  },

  addExtensions() {
    return [SuggestionMark];
  },

  addCommands() {
    return {
      setSuggestionMode:
        (enabled: boolean) =>
        ({ tr }) => {
          const mode: SuggestionMode = enabled ? "suggesting" : "editing";
          this.storage.mode = mode;
          tr.setMeta(SUGGESTIONS_PLUGIN_KEY, {
            mode,
          } satisfies SuggestionsPluginMeta);
          return true;
        },
      selectSuggestion:
        (id: string | null) =>
        ({ tr }) => {
          tr.setMeta(SUGGESTIONS_PLUGIN_KEY, {
            activeSuggestionId: id,
            hoveredSuggestionId: null,
          } satisfies SuggestionsPluginMeta);
          return true;
        },
      acceptSuggestion:
        (id: string) =>
        ({ tr, state }) => {
          return processSuggestionRanges(tr, state, id, "accept");
        },
      rejectSuggestion:
        (id: string) =>
        ({ tr, state }) => {
          return processSuggestionRanges(tr, state, id, "reject");
        },
      acceptAllSuggestions:
        () =>
        ({ tr, state }) => {
          return processSuggestionRanges(tr, state, null, "accept");
        },
      rejectAllSuggestions:
        () =>
        ({ tr, state }) => {
          return processSuggestionRanges(tr, state, null, "reject");
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<SuggestionsPluginState>({
        key: SUGGESTIONS_PLUGIN_KEY,

        appendTransaction: (transactions, oldState, newState) => {
          const pluginState = SUGGESTIONS_PLUGIN_KEY.getState(oldState);
          if (pluginState?.mode !== "suggesting") {
            return null;
          }

          const tr = newState.tr;
          let changed = false;
          const intermediateTr = new Transform(oldState.doc);
          let previousStep: Step | null = null;

          transactions.forEach((transaction, transactionIndex) => {
            if (
              transaction.getMeta(ySyncPluginKey) ||
              transaction.getMeta("history$") ||
              transaction.getMeta(SUGGESTIONS_TRANSACTION_KEY)
            ) {
              return;
            }

            let restoredDeletionInTransaction = false;

            transaction.steps.forEach((step, stepIndex) => {
              if (previousStep) {
                intermediateTr.step(previousStep);
              }
              previousStep = step;

              if (!isReplaceLikeStep(step)) {
                return;
              }

              const removedSlice = intermediateTr.doc.slice(
                step.from,
                step.to,
                false
              );
              const addedSliceSize = getAddedSliceSize(step);

              if (removedSlice.size === 0 && addedSliceSize === 0) {
                return;
              }

              const userId = this.options.getUserId() || DEFAULT_USER_ID;
              const existingInsertionMark = findInsertionSuggestionMarkAround(
                intermediateTr.doc,
                step.from,
                userId
              );
              const existingDeletionMark = findDeleteSuggestionMarkAround(
                intermediateTr.doc,
                step.from,
                step.to,
                userId
              );

              if (removedSlice.size > 0 && sliceHasSuggestionMark(removedSlice)) {
                return;
              }

              const mappedFrom = tr.mapping.map(
                mapStepPositionToNewDoc(
                  transactions,
                  transactionIndex,
                  stepIndex,
                  step.from,
                  -1
                ),
                -1
              );
              const now = new Date().toISOString();

              const from = mappedFrom;

              if (removedSlice.size > 0) {
                const shouldUseBlockPlaceholder =
                  intermediateTr.doc.textBetween(step.from, step.to).length ===
                    0;
                const selectionText = oldState.selection.empty
                  ? ""
                  : oldState.doc.textBetween(
                      oldState.selection.from,
                      oldState.selection.to
                    );
                if (shouldUseBlockPlaceholder && selectionText.length > 0) {
                  return;
                }
                const existingDeletionAttrs = existingDeletionMark
                  ? getSuggestionMarkAttributes(existingDeletionMark)
                  : null;
                const deleteMark =
                  existingDeletionMark ??
                  createSuggestionMark(newState, {
                    suggestionId:
                      existingDeletionAttrs?.suggestionId ??
                      this.options.createSuggestionId(),
                    userId,
                    kind: "delete",
                    createdAt: existingDeletionAttrs?.createdAt ?? now,
                    isBlockPlaceholder: shouldUseBlockPlaceholder,
                  });

                if (!deleteMark) {
                  return;
                }

                const sliceToRestore = shouldUseBlockPlaceholder
                  ? addDeletionPlaceholdersToSlice(
                      removedSlice,
                      oldState.doc,
                      deleteMark
                    )
                  : removedSlice;

                tr.replace(from, from, sliceToRestore);
                if (!shouldUseBlockPlaceholder) {
                  tr.addMark(from, from + sliceToRestore.size, deleteMark);
                }
                if (
                  oldState.selection.empty &&
                  oldState.selection.from === step.to
                ) {
                  tr.setSelection(TextSelection.create(tr.doc, from));
                }
                changed = true;
              }

              if (
                addedSliceSize > 0 &&
                !restoredDeletionInTransaction &&
                sliceHasInlineContent(step.slice)
              ) {
                const existingInsertionAttrs = existingInsertionMark
                  ? getSuggestionMarkAttributes(existingInsertionMark)
                  : null;
                const insertMark =
                  existingInsertionMark ??
                  createSuggestionMark(newState, {
                    suggestionId:
                      existingInsertionAttrs?.suggestionId ??
                      this.options.createSuggestionId(),
                    userId,
                    kind: "insert",
                    createdAt: existingInsertionAttrs?.createdAt ?? now,
                  });

                if (!insertMark) {
                  return;
                }

                const addedFrom = from + removedSlice.size;
                tr.addMark(addedFrom, addedFrom + addedSliceSize, insertMark);
                changed = true;
              }

              if (removedSlice.size > 0) {
                restoredDeletionInTransaction = true;
              }
            });
          });

          if (!changed) {
            return null;
          }

          tr.setMeta(SUGGESTIONS_TRANSACTION_KEY, {
            skipSuggestionOperation: true,
          } satisfies SuggestionsTransactionMeta);

          return tr;
        },

        state: {
          init: (_, state) =>
            createPluginState(
              state.doc,
              this.options.initialMode,
              null,
              null
            ),
          apply: (tr, value) => {
            const meta = tr.getMeta(SUGGESTIONS_PLUGIN_KEY) as
              | SuggestionsPluginMeta
              | undefined;

            if (!tr.docChanged && !meta) {
              return value;
            }

            const mode = meta?.mode ?? value.mode;
            this.storage.mode = mode;

            const activeSuggestionId =
              meta && hasOwnProperty(meta, "activeSuggestionId")
                ? (meta.activeSuggestionId as string | null)
                : value.activeSuggestionId;
            const hoveredSuggestionId =
              meta && hasOwnProperty(meta, "hoveredSuggestionId")
                ? (meta.hoveredSuggestionId as string | null)
                : value.hoveredSuggestionId;

            return createPluginState(
              tr.doc,
              mode,
              activeSuggestionId,
              hoveredSuggestionId
            );
          },
        },

        props: {
          decorations: (state) =>
            SUGGESTIONS_PLUGIN_KEY.getState(state)?.decorations ??
            DecorationSet.empty,
          handleClick: (view, _pos, event) => {
            if (event.button !== 0) {
              return false;
            }

            dispatchSuggestionMeta(view, {
              activeSuggestionId: getSuggestionIdFromEvent(event),
              hoveredSuggestionId: null,
            });
            return false;
          },
          handleDOMEvents: {
            mouseover: (view, event) => {
              const suggestionId = getSuggestionIdFromEvent(event);
              if (!suggestionId) {
                return false;
              }

              dispatchSuggestionMeta(view, {
                hoveredSuggestionId: suggestionId,
              });
              return false;
            },
          },
        },
      }),
      new Plugin({
        props: {
          transformCopied: (slice) => stripSuggestionMarks(slice),
          transformPasted: (slice) => stripSuggestionMarks(slice),
        },
      }),
    ];
  },
});

function stripSuggestionMarks(slice: Slice): Slice {
  const stripFragment = (fragment: Fragment): Fragment => {
    let changed = false;
    const nodes: Node[] = [];

    fragment.forEach((node) => {
      const nextMarks = node.marks.filter(
        (mark) => mark.type.name !== LIVEBLOCKS_SUGGESTION_MARK_TYPE
      );
      const marksChanged = nextMarks.length !== node.marks.length;
      const nextContent =
        node.content.childCount > 0 ? stripFragment(node.content) : node.content;
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
}
