import { NextRequest, NextResponse } from "next/server";
import { NAMES } from "../../../database";

/**
 * Get a user's info from their ID
 * For `resolveUser` in liveblocks.config.ts
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId || !userId.startsWith("user-")) {
    return new NextResponse("Missing or invalid userId", { status: 400 });
  }

  const userIndex = Number(userId.replace(/^\D+/g, "")) ?? 0;

  return NextResponse.json({
    name: NAMES[userIndex],
    avatar: `https://liveblocks.io/avatars/avatar-${userIndex}.png`,
  });
}
