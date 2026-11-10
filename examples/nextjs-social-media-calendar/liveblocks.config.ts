import type { LiveMap, LiveObject } from "@liveblocks/client";
import type { PostData } from "./lib/posts";

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

    // Realtime presence, shared with everyone in the room. In the project
    // room it holds the id of the post a user currently has open, so the
    // calendar can show who's editing what.
    Presence: {
      editingPostId: string | null;
    };

    // The project room stores every post's metadata (platform, date, status,
    // text preview) in a LiveMap. Each post's body lives in its own room as a
    // Tiptap document backed by LiveText, under `_tiptap_docs`.
    Storage: {
      posts: LiveMap<string, LiveObject<PostData>>;
    };
  }
}

export {};
