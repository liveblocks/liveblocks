import type { JSONContent } from "@tiptap/core";

import type { SuggestionKind } from "../types";
import { LIVEBLOCKS_SUGGESTION_MARK_TYPE } from "../types";

function getSuggestionKind(
  mark: NonNullable<JSONContent["marks"]>[number]
): SuggestionKind | null {
  if (mark.type !== LIVEBLOCKS_SUGGESTION_MARK_TYPE) {
    return null;
  }

  const kind: unknown = mark.attrs?.kind;
  return kind === "insert" || kind === "delete" ? kind : null;
}

/**
 * Returns Tiptap JSON content with pending suggestions projected into a clean
 * document: suggested insertions are removed, suggested deletions are kept, and
 * suggestion metadata is stripped.
 */
export function getCleanSuggestionContent(
  content: JSONContent
): JSONContent | null {
  const marks = content.marks ?? [];
  const hasInsertSuggestion = marks.some(
    (mark) => getSuggestionKind(mark) === "insert"
  );

  if (hasInsertSuggestion) {
    return null;
  }

  const nextMarks = marks.filter(
    (mark) => mark.type !== LIVEBLOCKS_SUGGESTION_MARK_TYPE
  );
  const nextContent = content.content
    ?.map((child) => getCleanSuggestionContent(child))
    .filter((child): child is JSONContent => child !== null);

  return {
    ...content,
    ...(nextMarks.length > 0 ? { marks: nextMarks } : { marks: undefined }),
    ...(nextContent ? { content: nextContent } : {}),
  };
}
