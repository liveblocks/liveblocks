// A slide proposal made by the AI, attached to a feed message. Selecting one
// for preview is local to each user; accepting/rejecting is shared with the
// whole room through the feed message's `proposalStatus`.
export type SlideProposal = {
  feedId: string;
  messageId: string;
  proposals: { slideId: string; html: string }[];
};

export async function resolveProposal(
  roomId: string,
  proposal: SlideProposal,
  action: "apply" | "reject"
) {
  await fetch("/api/apply-slide", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action,
      roomId,
      feedId: proposal.feedId,
      messageId: proposal.messageId,
    }),
  });
}
