// A slide proposal made by the AI, attached to a feed message. Selecting one
// for preview is local to each user; accepting/rejecting is shared with the
// whole room through the feed message's `proposalStatus`.
export type SlideProposal = {
  feedId: string;
  messageId: string;
  proposals: { slideId: string; html: string }[];
};

// Resolves to the ids of slides the apply created (empty when rejecting or
// when the proposal only edited existing slides), so the caller can switch
// the user to the newly created slide.
export async function resolveProposal(
  roomId: string,
  proposal: SlideProposal,
  action: "apply" | "reject"
): Promise<{ newSlideIds: string[] }> {
  const response = await fetch("/api/apply-slide", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action,
      roomId,
      feedId: proposal.feedId,
      messageId: proposal.messageId,
    }),
  });

  if (!response.ok) {
    return { newSlideIds: [] };
  }

  const data = (await response.json().catch(() => null)) as {
    newSlideIds?: string[];
  } | null;
  return { newSlideIds: data?.newSlideIds ?? [] };
}
