import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
  baseUrl: process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL!,
});

// PATCH /api/feeds/[feedId]/messages/[messageId] - Update a feed message
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ feedId: string; messageId: string }> }
) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  try {
    const { feedId, messageId } = await params;
    const body = await request.json();
    const { roomId, data } = body;

    if (!roomId) {
      return new NextResponse("Missing roomId in body", { status: 400 });
    }

    if (!data) {
      return new NextResponse("Missing data in body", { status: 400 });
    }

    await liveblocks.updateFeedMessage({
      roomId,
      feedId,
      messageId,
      data,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error updating feed message:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE /api/feeds/[feedId]/messages/[messageId]?roomId=xxx - Delete a feed message
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ feedId: string; messageId: string }> }
) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const { feedId, messageId } = await params;
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get("roomId");

  if (!roomId) {
    return new NextResponse("Missing roomId parameter", { status: 400 });
  }

  try {
    await liveblocks.deleteFeedMessage({
      roomId,
      feedId,
      messageId,
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting feed message:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
