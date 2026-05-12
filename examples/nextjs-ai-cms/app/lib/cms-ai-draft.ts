import type { CmsPost, CmsPostPatch, CmsAiDraftSnapshot } from "../../liveblocks.config";

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
