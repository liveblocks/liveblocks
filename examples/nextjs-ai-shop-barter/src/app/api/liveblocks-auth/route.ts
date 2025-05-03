import { Liveblocks } from "@liveblocks/node";
import { NAMES } from "../../../database";
import { NextRequest, NextResponse } from "next/server";

/**
 * Authenticating your Liveblocks application
 * https://liveblocks.io/docs/authentication
 */

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(request: NextRequest) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  // Get the current user's unique id from your database
  const userIndex = Math.floor(Math.random() * NAMES.length);

  // Create a session for the current user (access token auth)
  const session = liveblocks.prepareSession(`user-${userIndex}`);

  // Use a naming pattern to allow access to rooms with a wildcard
  session.allow(`liveblocks:examples:*`, session.FULL_ACCESS);

  // Authorize the user and return the result
  const { status, body } = await session.authorize();
  return new NextResponse(body, { status });
}
