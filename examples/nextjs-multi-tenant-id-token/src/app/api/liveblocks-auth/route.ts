import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "../../../database";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(request: NextRequest) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const { userId: providedUserId, tenantId } = await request.json();

  const userId = providedUserId ?? `user-${Math.round(Math.random())}`;
  const user = await getUser(userId);

  if (!user) {
    return new NextResponse("Invalid user", { status: 403 });
  }

  const res = await liveblocks.identifyUser(
    {
      userId,
      groupIds: [`${tenantId}:all`, `${tenantId}:${userId}`],
    },
    {
      userInfo: user.info,
    }
  );

  return new NextResponse(res.body, { status: res.status });
}
