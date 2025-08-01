import { NextRequest, NextResponse } from "next/server";
import { NAMES } from "../../../database";

/**
 * Get users' info from their ID
 * For `resolveUsers` in liveblocks.config.ts
 */

function getUser(userId: string) {
  if (!userId.startsWith("user-")) {
    return;
  }

  const userIndex = Number(userId.replace(/^\D+/g, "")) ?? 0;

  return {
    name: NAMES[userIndex],
    avatar: `https://liveblocks.io/avatars/avatar-${userIndex}.png`,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userIds = searchParams.getAll("userIds");

  if (!userIds || !Array.isArray(userIds)) {
    return new NextResponse("Missing or invalid userIds", { status: 400 });
  }

  return NextResponse.json(userIds.map((userId) => getUser(userId)));
}
