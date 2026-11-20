// Per-tab composer state, keyed by conversation (feed) id: which mode is
// active, the (personal) internal-note draft, and the last send error. Reply
// drafts live in a shared Tiptap document instead, so they aren't kept here.
// A reply that fails to send is handed back through here so the composer can
// restore it.

export type ComposerMode = "reply" | "note";

export type Draft = {
  mode: ComposerMode;
  // Internal-note draft.
  text: string;
  // Why the last send attempt failed, shown above the composer.
  error: string | null;
};

const drafts = new Map<string, Draft>();
const restoreListeners = new Set<
  (feedId: string, text: string, error: string) => void
>();

export function getDraft(feedId: string) {
  return drafts.get(feedId);
}

export function saveDraft(feedId: string, draft: Draft) {
  drafts.set(feedId, draft);
}

export function clearDraft(feedId: string) {
  drafts.delete(feedId);
}

/**
 * Hands a reply that couldn't be sent back to the composer for that
 * conversation, with the reason, so it can be put back into the shared draft.
 */
export function restoreFailedReply(
  feedId: string,
  text: string,
  error: string
) {
  const draft = drafts.get(feedId);
  drafts.set(feedId, { mode: "reply", text: draft?.text ?? "", error });
  for (const listener of restoreListeners) {
    listener(feedId, text, error);
  }
}

export function onDraftRestored(
  listener: (feedId: string, text: string, error: string) => void
) {
  restoreListeners.add(listener);
  return () => {
    restoreListeners.delete(listener);
  };
}
