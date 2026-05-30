import { NextRequest, NextResponse } from "next/server";
import { Liveblocks, RoomAccesses } from "@liveblocks/node";
import { Permission } from "@liveblocks/core";

const client = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const { roomId } = params;

  try {
    const room = await client.getRoom(roomId);
    return NextResponse.json(room);
  } catch (error) {
    console.error("Error getting room", error);
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const { roomId } = params;

  const { tenantId, userId, isPrivate } = await request.json();

  const groupsAccesses: RoomAccesses = isPrivate
    ? {
        [`${tenantId}:${userId}`]: [Permission.Write],
      }
    : {
        [`${tenantId}:all`]: [Permission.Write],
      };

  const room = await client.createRoom(roomId, {
    defaultAccesses: [],
    groupsAccesses,
  });

  return NextResponse.json(room);
}
