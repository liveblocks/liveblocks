import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/app/database";

/**
 * Returns user info from user IDs.
 * For `resolveUsers` in LiveblocksProvider.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userIds = searchParams.getAll("userIds");

  if (!userIds || !Array.isArray(userIds)) {
    return new NextResponse("Missing or invalid userIds", { status: 400 });
  }

  return NextResponse.json(
    userIds.map((userId) => getUser(userId)?.info || null),
    { status: 200 }
  );
}
