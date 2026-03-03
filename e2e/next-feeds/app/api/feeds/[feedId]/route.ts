import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
  baseUrl: process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL!,
});

// GET /api/feeds/[feedId]?roomId=xxx - Get a specific feed
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
    const feed = await liveblocks.getFeed({
      roomId,
      feedId: params.feedId,
    });
    return NextResponse.json(feed);
  } catch (error) {
    console.error("Error fetching feed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// PATCH /api/feeds/[feedId] - Update feed metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: { feedId: string } }
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

    await liveblocks.updateFeed({
      roomId,
      feedId: params.feedId,
      metadata,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error updating feed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE /api/feeds/[feedId]?roomId=xxx - Delete a feed
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
    await liveblocks.deleteFeed({
      roomId,
      feedId: params.sessionId,
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting feed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
