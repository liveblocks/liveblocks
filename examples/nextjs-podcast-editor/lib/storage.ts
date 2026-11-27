import { LiveMap, LiveObject } from "@liveblocks/client";

export type Episode = {
  title: string;
};

export type Chapter = {
  id: string;
  // Chapters start at the beginning of a paragraph, so they move with the
  // edit: cutting words before a chapter moves its timestamp earlier.
  paragraphId: string;
  title: string;
};

const INITIAL_CHAPTERS: Chapter[] = [
  { id: "chapter-intro", paragraphId: "p0", title: "Intro" },
  {
    id: "chapter-presence",
    paragraphId: "p2",
    title: "What makes a product multiplayer",
  },
  { id: "chapter-conflicts", paragraphId: "p6", title: "Conflicts and undo" },
  { id: "chapter-start", paragraphId: "p10", title: "Where to start" },
];

/** Storage for a brand new room: an unedited episode with a few chapters. */
export function createInitialStorage(): Liveblocks["Storage"] {
  return {
    episode: new LiveObject({ title: "Designing for multiplayer" }),
    cuts: new LiveMap(),
    speakerNames: new LiveMap(),
    chapters: new LiveMap(
      INITIAL_CHAPTERS.map((chapter) => [chapter.id, new LiveObject(chapter)])
    ),
  };
}
