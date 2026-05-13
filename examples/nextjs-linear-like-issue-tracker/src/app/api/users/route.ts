import { AI_USER_INFO, getUser } from "@/database";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userIds = searchParams.getAll("userIds");

  if (!userIds || !Array.isArray(userIds)) {
    return new NextResponse("Missing or invalid userIds", { status: 400 });
  }

  const aiEnabled = Boolean(process.env.LIVEBLOCKS_WEBHOOK_SECRET_KEY);

  return NextResponse.json(
    userIds.map((userId) => {
      if (!aiEnabled && userId === AI_USER_INFO.id) {
        return null;
      }
      return getUser(userId)?.info || null;
    }),
    { status: 200 }
  );
}
