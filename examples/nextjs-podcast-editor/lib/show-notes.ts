import { formatChapterTime } from "./format";
import { EPISODE_NUMBER, SHOW_NAME } from "./transcript";

export type ChapterMarker = { id: string; title: string; time: number };

/**
 * Show notes in the format podcast apps and YouTube read chapters from:
 * one "MM:SS Title" line per chapter, the first one at 00:00.
 */
export function showNotes(title: string, chapters: ChapterMarker[]) {
  const lines = [
    `${title || "Untitled episode"}`,
    `${SHOW_NAME} · Episode ${EPISODE_NUMBER}`,
  ];
  if (chapters.length > 0) {
    lines.push("", "Chapters");
    for (const chapter of chapters) {
      lines.push(
        `${formatChapterTime(chapter.time)} ${chapter.title || "Untitled chapter"}`
      );
    }
  }
  return lines.join("\n");
}
