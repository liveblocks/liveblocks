import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
  // @ts-expect-error
  baseUrl: process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL!,
});

// POST /api/agent-sessions/[sessionId]/messages/[messageId] - Update a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; messageId: string }> }
) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  try {
    const { sessionId, messageId } = await params;
    const body = await request.json();
    const { roomId, data } = body;

    if (!roomId) {
      return new NextResponse("Missing roomId in body", { status: 400 });
    }

    if (!data) {
      return new NextResponse("Missing data in body", { status: 400 });
    }

    const message = await liveblocks.updateAgentMessage({
      roomId,
      agentSessionId: sessionId,
      messageId: messageId,
      data,
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error("Error updating agent message:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE /api/agent-sessions/[sessionId]/messages/[messageId]?roomId=xxx - Delete a message
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; messageId: string }> }
) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get("roomId");

  if (!roomId) {
    return new NextResponse("Missing roomId parameter", { status: 400 });
  }

  try {
    const { sessionId, messageId } = await params;
    await liveblocks.deleteAgentMessage({
      roomId,
      agentSessionId: sessionId,
      messageId: messageId,
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting agent message:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
