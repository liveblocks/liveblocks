import { Liveblocks } from "@liveblocks/node";
import { NAMES } from "../../../database";
import { NextRequest, NextResponse } from "next/server";

/**
 * Authenticating your Liveblocks application
 * https://liveblocks.io/docs/rooms/authentication/access-token-permissions/nextjs
 */

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
  // @ts-expect-error: dev
  baseUrl: "https://dev.dev-liveblocks5948.workers.dev/",
});

export async function POST(request: NextRequest) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const userIndexCookie = request.cookies.get("userIndex");

  // Get the current user's unique id from your database
  const userIndex = userIndexCookie
    ? Number(userIndexCookie.value) % NAMES.length
    : Math.floor(Math.random() * NAMES.length);

  // Create a session for the current user
  const session = liveblocks.prepareSession(`user-${userIndex}`);

  // Give the user access to the room
  const { room } = await request.json();
  session.allow(room, session.FULL_ACCESS);

  // Authorize the user and return the result
  const { status, body } = await session.authorize();
  return new NextResponse(body, { status });
}
