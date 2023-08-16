import { Liveblocks } from "@liveblocks/node";
import { NAMES } from "../../../database";
import { NextRequest, NextResponse } from "next/server";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(request: NextRequest) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const userIndex = Math.floor(Math.random() * NAMES.length);
  const session = liveblocks.prepareSession(`user-${userIndex}`);

  const { room } = await request.json();
  session.allow(room, session.FULL_ACCESS);

  const { status, body } = await session.authorize();

  return new NextResponse(body, { status });
}
