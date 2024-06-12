import { NextRequest, NextResponse } from "next/server";
import { getRoom } from "../../../database";

/**
 * Get rooms' info from their ID
 * For `resolveRoomsInfo` in liveblocks.config.ts
 */

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
