import { NextRequest, NextResponse } from "next/server";
import { Liveblocks } from "@liveblocks/node";
import { Permission } from "@liveblocks/core";

const client = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const { roomId } = params;

  const { tenantId, userId } = await request.json();

  const roomBefore = await client.getRoom(roomId);

  const room = await client.updateRoom(roomId, {
    groupsAccesses: {
      ...roomBefore.groupsAccesses,
      [`${tenantId}:${userId}`]: [Permission.Write],
    },
  });

  return NextResponse.json(room);
}
