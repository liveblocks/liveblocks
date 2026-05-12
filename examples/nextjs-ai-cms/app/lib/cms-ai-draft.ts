import type {
  CmsPost,
  CmsPostPatch,
  CmsAiDraftSnapshot,
  CmsAiFieldPhaseEntry,
} from "../../liveblocks.config";

export const CMS_DRAFT_KEYS: (keyof CmsPost)[] = [
  "title",
  "slug",
  "excerpt",
  "body",
  "publishedAt",
];

export function draftToStoragePatch(draft: CmsAiDraftSnapshot): CmsPostPatch {
  const out: CmsPostPatch = {};
  for (const k of CMS_DRAFT_KEYS) {
    const v = draft[k];
    if (typeof v === "string") {
      out[k] = v;
    }
  }
  return out;
}

/** Merge draft snapshot onto current post for preview (null/undefined → keep current). */
export function mergeDraftWithPost(post: CmsPost, snap: CmsAiDraftSnapshot): CmsPost {
  const out: CmsPost = { ...post };
  for (const k of CMS_DRAFT_KEYS) {
    const d = snap[k];
    if (typeof d === "string") {
      out[k] = d;
    }
  }
  return out;
}

export type PartialDraft = Partial<
  Record<keyof CmsPost, string | null | undefined>
>;

/** Build per-field phase rows for the draft feed (partial stream vs final). */
export function fieldPhaseEntriesFromPartial(
  partial: PartialDraft,
  isComplete: boolean,
  mergedBefore: PartialDraft = {}
): CmsAiFieldPhaseEntry[] {
  return CMS_DRAFT_KEYS.map((field) => {
    const v = partial[field];
    if (isComplete) {
      if (v === null || v === undefined) {
        return { field, phase: "unchanged" as const };
      }
      return { field, phase: "complete" as const };
    }
    if (v === undefined) {
      const existing = mergedBefore[field];
      if (typeof existing === "string") {
        return { field, phase: "ready" as const };
      }
      return { field, phase: "waiting" as const };
    }
    if (v === null) {
      return { field, phase: "unchanged" as const };
    }
    const prev = mergedBefore[field];
    if (typeof prev === "string" && v === prev) {
      return { field, phase: "ready" as const };
    }
    return { field, phase: "streaming" as const };
  });
}
