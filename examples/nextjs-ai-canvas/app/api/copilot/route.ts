import { NextResponse } from "next/server";
import { getLiveblocks } from "@/lib/liveblocksServer";
import { runAgent } from "@/lib/agent/runAgent";

type CopilotBody = {
  roomId?: string;
  feedId?: string;
  userMessage?: string;
  context?: {
    selectedShapeIds?: string[];
    selectedShapes?: Array<Record<string, unknown>>;
  };
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as CopilotBody;
  const roomId = body.roomId;
  const feedId = body.feedId;
  const userMessage = body.userMessage;

  if (!roomId || !feedId || !userMessage) {
    return NextResponse.json(
      { error: "Missing roomId, feedId, or userMessage" },
      { status: 400 }
    );
  }

  const liveblocks = getLiveblocks();

  await liveblocks.createFeed({
    roomId,
    feedId,
    metadata: { kind: "ai-canvas" },
  }).catch(() => {
    // feed may already exist
  });

  const assistantMessage = await liveblocks.createFeedMessage({
    roomId,
    feedId,
    data: {
      role: "assistant",
      text: "",
      reasoning: "",
      status: "thinking",
      isStreaming: true,
    },
  });

  await runAgent({
    roomId,
    userMessage,
    selectedShapeIds: body.context?.selectedShapeIds ?? [],
    selectedShapes: body.context?.selectedShapes ?? [],
    onProgress: async (update) => {
      await liveblocks.updateFeedMessage({
        roomId,
        feedId,
        messageId: assistantMessage.id,
        data: {
          role: "assistant",
          text: update.text ?? "",
          reasoning: update.reasoning ?? "",
          status: update.status ?? "thinking",
          isStreaming: update.isStreaming ?? true,
        },
      });
    },
  });

  return NextResponse.json({ ok: true });
}
