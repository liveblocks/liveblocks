import { NextRequest, NextResponse } from "next/server";
import { getUser } from "../../../database";

/**
 * Get users' info from their ID
 * For `resolveUsers` in liveblocks.config.ts
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userIds = searchParams.getAll("userIds");

  if (!userIds || !Array.isArray(userIds)) {
    return new NextResponse("Missing or invalid userIds", { status: 400 });
  }

  const users = (
    await Promise.all(userIds.map((userId) => getUser(userId)))
  ).map((user) => user?.info);

  return NextResponse.json(users);
}
