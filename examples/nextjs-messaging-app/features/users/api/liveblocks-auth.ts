import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { AI_USER_ID, getRandomUser, getUser } from "@/lib/database";

export async function POST(request: NextRequest) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY,
    baseUrl: process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL,
  });

  const { userId } = (await request.json().catch(() => ({}))) as {
    userId?: string;
  };

  const user =
    userId && userId !== AI_USER_ID ? getUser(userId) : getRandomUser();

  if (!user) {
    return new NextResponse("User not found", { status: 403 });
  }

  const session = liveblocks.prepareSession(`${user.id}`, {
    userInfo: user.info,
  });

  session.allow(`liveblocks:examples:*`, ["*:write"]);

  const { status, body } = await session.authorize();
  return new NextResponse(body, { status });
}
