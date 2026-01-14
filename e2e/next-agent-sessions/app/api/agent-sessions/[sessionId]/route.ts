import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
  // @ts-expect-error
  baseUrl: process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL!,
});

// GET /api/agent-sessions/[sessionId]?roomId=xxx - Get a specific agent session
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
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
    const session = await liveblocks.getAgentSession({
      roomId,
      agentSessionId: params.sessionId,
    });
    return NextResponse.json(session);
  } catch (error) {
    console.error("Error fetching agent session:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/agent-sessions/[sessionId] - Update agent session metadata
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  try {
    const body = await request.json();
    const { roomId, metadata } = body;

    if (!roomId) {
      return new NextResponse("Missing roomId in body", { status: 400 });
    }

    if (!metadata) {
      return new NextResponse("Missing metadata in body", { status: 400 });
    }

    const session = await liveblocks.updateAgentSessionMetadata({
      roomId,
      agentSessionId: params.sessionId,
      metadata,
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error("Error updating agent session:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE /api/agent-sessions/[sessionId]?roomId=xxx - Delete an agent session
export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
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
    await liveblocks.deleteAgentSession({
      roomId,
      agentSessionId: params.sessionId,
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting agent session:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
