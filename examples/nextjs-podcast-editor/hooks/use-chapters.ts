"use client";

import { useStorage } from "@liveblocks/react/suspense";
import { useMemo } from "react";
import { useEditor } from "@/components/editor-context";
import { toEdited, type Timeline } from "@/lib/timeline";
import { PARAGRAPHS, spanStart, type Paragraph } from "@/lib/transcript";

export type ChapterItem = {
  id: string;
  title: string;
  paragraphId: string;
  paragraphIndex: number;
  // Where it starts in the edited episode, or null when its paragraph is cut.
  time: number | null;
};

/** Every chapter, in episode order, with its timestamp in the edit. */
export function useChapters(): ChapterItem[] {
  const { timeline, cuts } = useEditor();
  const chapters = useStorage((root) => root.chapters);

  return useMemo(() => {
    const items: ChapterItem[] = [];
    for (const chapter of Object.values(chapters)) {
      const paragraph = PARAGRAPHS.find(
        (item) => item.id === chapter.paragraphId
      );
      if (!paragraph) {
        continue;
      }
      items.push({
        id: chapter.id,
        title: chapter.title,
        paragraphId: chapter.paragraphId,
        paragraphIndex: paragraph.index,
        time: paragraphTime(paragraph, timeline, cuts),
      });
    }
    return items.sort((a, b) => a.paragraphIndex - b.paragraphIndex);
  }, [chapters, timeline, cuts]);
}

/** Where a paragraph starts in the edited episode, or null if it's all cut. */
export function paragraphTime(
  paragraph: Paragraph,
  timeline: Timeline,
  cuts: ReadonlySet<number>
) {
  const firstKept = paragraph.words.find((word) => !cuts.has(word.index));
  return firstKept ? toEdited(timeline, spanStart(firstKept.index)) : null;
}
