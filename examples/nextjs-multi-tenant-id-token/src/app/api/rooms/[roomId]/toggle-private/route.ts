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

  const room = await client.getRoom(roomId);

  const { tenantId, isPrivate } = await request.json();

  if (isPrivate) {
    delete room.groupsAccesses[`${tenantId}:all`];

    await client.updateRoom(roomId, {
      groupsAccesses: room.groupsAccesses,
    });
  } else {
    await client.updateRoom(roomId, {
      groupsAccesses: {
        ...room.groupsAccesses,
        [`${tenantId}:all`]: [Permission.Write],
      },
    });
  }
}
