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

/** Per-field AI lifecycle (emitted on the draft feed). */
export type CmsAiFieldPhaseLabel =
  | "waiting"
  | "unchanged"
  | "streaming"
  | "ready"
  | "complete"
  | "error";

export type CmsAiFieldPhaseEntry = {
  field: keyof CmsPost;
  phase: CmsAiFieldPhaseLabel;
};

/** Room-wide AI lifecycle (emitted on the draft feed). */
export type CmsAiRunPhase =
  | "preparing"
  | "working"
  | "generating"
  | "finalizing"
  | "complete"
  | "error";

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
      kind: "start" | "partial" | "complete" | "error" | "status" | "field_phases";
      /** Raw structured snapshot from the model (null = leave field as in Storage). */
      draft?: CmsAiDraftSnapshot;
      message?: string;
      /** Latest room-wide phase (from `status` messages). */
      phase?: CmsAiRunPhase;
      /** Latest per-field phases (from `field_phases` messages). */
      fieldPhases?: CmsAiFieldPhaseEntry[];
    };
  }
}

export {};
