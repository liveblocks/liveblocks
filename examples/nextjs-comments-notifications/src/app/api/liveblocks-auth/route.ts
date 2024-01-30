import { Liveblocks } from "@liveblocks/node";
import { NAMES } from "../../../database";
import { NextRequest, NextResponse } from "next/server";
import { getUserIndexFromUserId } from "../../../utils/ids";

/**
 * Authenticating your Liveblocks application
 * https://liveblocks.io/docs/rooms/authentication/access-token-permissions/nextjs
 */

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(request: NextRequest) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const userIdCookie = request.cookies.get("userId");
  const userId = userIdCookie?.value;

  if (!userId) {
    return new NextResponse("Missing userId cookie", { status: 403 });
  }

  // Make sure that the user is valid
  const userIndex = getUserIndexFromUserId(userId);

  if (userIndex === undefined || !NAMES[Number(userIndex)]) {
    return new NextResponse("Invalid userId", { status: 403 });
  }

  // Create a session for the current user
  const session = liveblocks.prepareSession(userId);

  // Give the user access to the room
  const { room } = await request.json();

  session.allow(room, session.FULL_ACCESS);

  // Authorize the user and return the result
  const { status, body } = await session.authorize();
  return new NextResponse(body, { status });
}
