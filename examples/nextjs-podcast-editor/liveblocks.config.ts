import type { LiveMap, LiveObject } from "@liveblocks/client";
import type { Chapter, Episode } from "./lib/storage";

declare global {
  interface Liveblocks {
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string;
      info: {
        // Example properties, for useSelf, useUser, useOthers, etc.
        name: string;
        avatar: string;
        color: string;
      };
    };

    // Realtime presence, shared with everyone editing the episode: where
    // each person's playhead is, whether they're listening, and which words
    // they have selected in the transcript.
    Presence: {
      // In seconds of the original recording, so it stays put while words
      // are cut and restored around it.
      playhead: number;
      playing: boolean;
      // Inclusive range of word indices, or null.
      selection: { start: number; end: number } | null;
    };

    // The recording and its transcript are static files. Storage holds the
    // edit: which words are cut, speaker names, chapters, and the title.
    Storage: {
      episode: LiveObject<Episode>;
      // Cut word id → id of the user who cut it. Each word is its own key,
      // so people cutting different words at once never conflict.
      cuts: LiveMap<string, string>;
      // Speaker id → display name, once someone renames a speaker.
      speakerNames: LiveMap<string, string>;
      chapters: LiveMap<string, LiveObject<Chapter>>;
    };

    // Comments are anchored to a range of words in the transcript.
    ThreadMetadata: {
      startWord: number;
      endWord: number;
    };
  }
}

export {};
