import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
  // @ts-expect-error
  baseUrl: process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL!,
});

// GET /api/agent-sessions?roomId=xxx - List all agent sessions
export async function GET(request: NextRequest) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get("roomId");

  if (!roomId) {
    return new NextResponse("Missing roomId parameter", { status: 400 });
  }

  try {
    const result = await liveblocks.getAgentSessions({ roomId });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching agent sessions:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/agent-sessions - Create a new agent session
export async function POST(request: NextRequest) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  try {
    const body = await request.json();
    const { roomId, sessionId, metadata, timestamp } = body;

    if (!roomId) {
      return new NextResponse("Missing roomId in body", { status: 400 });
    }

    if (!sessionId) {
      return new NextResponse("Missing sessionId in body", { status: 400 });
    }

    const session = await liveblocks.createAgentSession({
      roomId,
      sessionId,
      metadata,
      timestamp,
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error("Error creating agent session:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
