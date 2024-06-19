import { getRoom } from "../../../database";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomIds = searchParams.getAll("roomIds");

  if (!roomIds || !Array.isArray(roomIds)) {
    return new NextResponse("Missing or invalid roomIds", { status: 400 });
  }

  return NextResponse.json(
    roomIds.map((roomId) => getRoom(roomId)?.info || null),
    { status: 200 }
  );
}
