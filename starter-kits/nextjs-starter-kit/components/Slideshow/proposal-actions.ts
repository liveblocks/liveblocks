export type SlideProposal = {
  feedId: string;
  messageId: string;
  proposals: { slideId: string; html: string }[];
};

export async function resolveProposal(
  roomId: string,
  proposal: SlideProposal,
  action: "apply" | "reject"
): Promise<{ newSlideIds: string[] }> {
  const response = await fetch("/api/slideshow/apply-slide", {
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

  const data = await response.json().catch(() => null);
  if (
    !data ||
    typeof data !== "object" ||
    !("newSlideIds" in data) ||
    !Array.isArray(data.newSlideIds)
  ) {
    return { newSlideIds: [] };
  }

  const { newSlideIds } = data;
  return {
    newSlideIds: newSlideIds.filter(
      (slideId: unknown): slideId is string => typeof slideId === "string"
    ),
  };
}
