import { NextRequest, NextResponse } from "next/server";
import { getRoom } from "../../../database";
import { Liveblocks } from "@liveblocks/node";
import { Permission } from "@liveblocks/core";
/**
 * Get rooms' info from their ID
 * For `resolveRoomsInfo` in liveblocks.config.ts
 */

const client = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomIds = searchParams.getAll("roomIds");

  if (!roomIds || !Array.isArray(roomIds)) {
    return new NextResponse("Missing or invalid roomIds", { status: 400 });
  }

  const rooms = (
    await Promise.all(roomIds.map((roomId) => getRoom(roomId)))
  ).map((room) => room);

  return NextResponse.json(rooms);
}

export async function POST(request: NextRequest) {
  const { roomId, tenantId, userId } = await request.json();

  let room;
  if (userId) {
    // private room
    room = await client.createRoom(roomId, {
      defaultAccesses: [],
      groupsAccesses: {
        [`${tenantId}:${userId}`]: [Permission.Write],
      },
    });
  } else {
    // public room
    room = await client.createRoom(roomId, {
      defaultAccesses: [],
      groupsAccesses: {
        [`${tenantId}:all`]: [Permission.Write],
      },
    });
  }

  return NextResponse.json(room);
}
