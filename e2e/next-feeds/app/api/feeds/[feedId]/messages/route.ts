import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
  baseUrl: process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL!,
});

// GET /api/feeds/[feedId]/messages?roomId=xxx - List feed messages
export async function GET(
  request: NextRequest,
  { params }: { params: { feedId: string } }
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
    const result = await liveblocks.getFeedMessages({
      roomId,
      feedId: params.feedId,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching feed messages:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/feeds/[feedId]/messages - Create a new feed message
export async function POST(
  request: NextRequest,
  { params }: { params: { feedId: string } }
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

    const message = await liveblocks.createFeedMessage({
      roomId,
      feedId: params.feedId,
      id,
      timestamp,
      data,
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error("Error creating feed message:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
