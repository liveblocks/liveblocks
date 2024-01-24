import { NextRequest, NextResponse } from "next/server";
import { NAMES } from "../../../../database";
import { getRoomIdFromUserId, getUserId } from "../../../../utils/ids";

/**
 * Returns a list of user IDs from a partial search input
 * For `resolveMentionSuggestions` in liveblocks.config.ts
 */

interface User {
  id: string;
  name: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text");

  const userIdCookie = request.cookies.get("userId");
  const userId = userIdCookie?.value;

  if (!userId) {
    return new NextResponse("Missing userId cookie", { status: 403 });
  }

  const roomId = getRoomIdFromUserId(userId);

  const userIndices = [...NAMES.keys()];
  const users = userIndices.map(
    (userIndex) =>
      ({ id: getUserId(userIndex, roomId), name: NAMES[userIndex] }) as User
  );
  const filteredUserIds = users
    .filter((user) =>
      text ? user.name.toLowerCase().includes(text.toLowerCase()) : true
    )
    .map((user) => user.id);

  return NextResponse.json(filteredUserIds);
}
