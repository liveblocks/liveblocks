import { LiveObject } from "@liveblocks/client";

export type CmsPost = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  /** ISO 8601 date (YYYY-MM-DD) */
  publishedAt: string;
};

/** Storage updates: only string entries are applied. (AI uses null in its JSON for “unchanged”.) */
export type CmsPostPatch = Partial<CmsPost>;

declare global {
  interface Liveblocks {
    Presence: {
      cursor: null;
      /** Field the user or AI is currently editing (AI via `setPresence`). */
      editingField: keyof CmsPost | null;
    };

    Storage: {
      post: LiveObject<CmsPost>;
    };

    UserMeta: {
      id: string;
      info: {
        name: string;
        avatar: string;
        color: string;
      };
    };

    FeedMetadata: {
      kind?: string;
    };

    FeedMessageData: {
      kind: "start" | "partial" | "complete" | "error";
      /** Latest structured snapshot from the model stream */
      fields?: CmsPostPatch;
      message?: string;
    };
  }
}

export {};
