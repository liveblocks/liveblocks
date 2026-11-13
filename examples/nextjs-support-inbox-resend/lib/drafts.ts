// Per-tab composer drafts, keyed by conversation (feed) id. Drafts survive
// switching between conversations, and a reply that fails to send is handed
// back here so the composer can restore it.

export type ComposerMode = "reply" | "note";

export type Draft = {
  mode: ComposerMode;
  text: string;
  // Why the last send attempt failed, shown above the composer.
  error: string | null;
};

const drafts = new Map<string, Draft>();
const restoreListeners = new Set<(feedId: string, draft: Draft) => void>();

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
 * Puts a reply that couldn't be sent back into the conversation's draft,
 * ahead of anything the agent has typed since, and tells the mounted
 * composer (if any) to pick it up.
 */
export function restoreFailedReply(
  feedId: string,
  text: string,
  error: string
) {
  const typedSince = drafts.get(feedId)?.text.trim() ?? "";
  const draft: Draft = {
    mode: "reply",
    text: typedSince ? `${text}\n\n${typedSince}` : text,
    error,
  };
  drafts.set(feedId, draft);
  for (const listener of restoreListeners) {
    listener(feedId, draft);
  }
}

export function onDraftRestored(
  listener: (feedId: string, draft: Draft) => void
) {
  restoreListeners.add(listener);
  return () => {
    restoreListeners.delete(listener);
  };
}
