import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
  // @ts-expect-error
  baseUrl: process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL!,
});

// POST /api/agent-sessions/[sessionId]/messages - Create a new message
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  try {
    const body = await request.json();
    const { roomId, id, timestamp, data } = body;

    if (!roomId) {
      return new NextResponse("Missing roomId in body", { status: 400 });
    }

    if (!data) {
      return new NextResponse("Missing data in body", { status: 400 });
    }

    const message = await liveblocks.createAgentMessage({
      roomId,
      agentSessionId: params.sessionId,
      id,
      timestamp,
      data,
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error("Error creating agent message:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
