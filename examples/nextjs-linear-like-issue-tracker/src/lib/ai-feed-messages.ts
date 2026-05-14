import { liveblocks } from "@/liveblocks.server.config";

// Different feed types

type FeedTarget = {
  roomId: string;
  feedId: string;
};

export async function writeFeedThinking(
  target: FeedTarget,
  deltaText: string,
  totalReasoning: string
): Promise<void> {
  await liveblocks.createFeedMessage({
    roomId: target.roomId,
    feedId: target.feedId,
    data: { stage: "thinking", responsePart: deltaText, response: totalReasoning },
  });
}

export async function writeFeedWriting(
  target: FeedTarget,
  deltaText: string,
  totalText: string
): Promise<void> {
  await liveblocks.createFeedMessage({
    roomId: target.roomId,
    feedId: target.feedId,
    data: { stage: "writing", responsePart: deltaText, response: totalText },
  });
}

export async function writeFeedStatus(
  target: FeedTarget,
  label: string
): Promise<void> {
  await liveblocks.createFeedMessage({
    roomId: target.roomId,
    feedId: target.feedId,
    data: { stage: "status", label },
  });
}

// Final message with full response
export async function writeFeedComplete(
  target: FeedTarget,
  payload: { response: string; reasoning: string; thinkingTime: number }
): Promise<void> {
  await liveblocks.createFeedMessage({
    roomId: target.roomId,
    feedId: target.feedId,
    data: {
      stage: "complete",
      response: payload.response,
      reasoning: payload.reasoning,
      thinkingTime: payload.thinkingTime,
    },
  });
}
