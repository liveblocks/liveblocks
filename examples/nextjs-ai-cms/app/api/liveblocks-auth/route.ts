import { Liveblocks } from "@liveblocks/node";
import { NextRequest } from "next/server";
import { getSession } from "../../example";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret || !secret.startsWith("sk_")) {
    return new Response("Missing LIVEBLOCKS_SECRET_KEY", { status: 500 });
  }

  const user = await getSession(request);

  const liveblocks = new Liveblocks({ secret });

  const session = liveblocks.prepareSession(`${user.id}`, {
    userInfo: user.info,
  });

  session.allow(`liveblocks:examples:nextjs-ai-cms:*`, session.FULL_ACCESS);

  const { body, status } = await session.authorize();
  return new Response(body, { status });
}
