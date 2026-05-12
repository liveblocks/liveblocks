import { LiveObject } from "@liveblocks/client";

export type CmsPost = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  /** ISO 8601 date (YYYY-MM-DD) */
  publishedAt: string;
};

/** Only string entries are written to Storage when the user accepts a draft. */
export type CmsPostPatch = Partial<CmsPost>;

/** Snapshot streamed in the draft feed (`string | null` from the model). */
export type CmsAiDraftSnapshot = {
  [K in keyof CmsPost]?: string | null;
};

declare global {
  interface Liveblocks {
    Presence: {
      cursor: null;
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
      /** Raw structured snapshot from the model (null = leave field as in Storage). */
      draft?: CmsAiDraftSnapshot;
      message?: string;
    };
  }
}

export {};
