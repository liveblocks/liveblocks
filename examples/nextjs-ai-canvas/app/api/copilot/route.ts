import { NextResponse } from "next/server";
import { getLiveblocks } from "@/lib/liveblocksServer";
import { runAgent } from "@/lib/agent/runAgent";

type ChatHistoryMessage = {
  role: "user" | "assistant";
  text: string;
};

type CopilotBody = {
  roomId?: string;
  feedId?: string;
  userMessage?: string;
  agentName?: string;
  history?: ChatHistoryMessage[];
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
  const agentName = body.agentName?.trim() || "Agent";

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
      agentName,
      text: "",
      reasoning: "",
      status: "thinking",
      isStreaming: true,
    },
  });

  let latestText = "";
  let latestReasoning = "";
  let latestStatus: "thinking" | "editing" | "idle" = "thinking";
  let latestIsStreaming = true;

  try {
    await runAgent({
      roomId,
      userMessage,
      agentName,
      history: Array.isArray(body.history) ? body.history : [],
      selectedShapeIds: body.context?.selectedShapeIds ?? [],
      selectedShapes: body.context?.selectedShapes ?? [],
      onProgress: async (update) => {
        latestText = update.text ?? latestText;
        latestReasoning = update.reasoning ?? latestReasoning;
        latestStatus = update.status ?? latestStatus;
        latestIsStreaming = update.isStreaming ?? latestIsStreaming;
        await liveblocks.updateFeedMessage({
          roomId,
          feedId,
          messageId: assistantMessage.id,
          data: {
            role: "assistant",
            agentName,
            text: latestText,
            reasoning: latestReasoning,
            status: latestStatus,
            isStreaming: latestIsStreaming,
          },
        });
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown agent error";
    console.error("[copilot] agent run failed", { roomId, agentName, message });
    await liveblocks.updateFeedMessage({
      roomId,
      feedId,
      messageId: assistantMessage.id,
      data: {
        role: "assistant",
        agentName,
        text:
          latestText ||
          "I hit an error while generating that design. Please try again.",
        reasoning: latestReasoning,
        status: "idle",
        isStreaming: false,
      },
    });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
