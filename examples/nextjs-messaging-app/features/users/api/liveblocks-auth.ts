import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";
import { getDemoUser, getPreviewUser } from "./demo-login";

export async function POST(request: NextRequest) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY,
    baseUrl: process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL,
  });

  const body: unknown = await request.json().catch(() => undefined);
  const previewUser = getPreviewUser(body);
  const user = previewUser ?? (await getSessionUser(request));

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const session = liveblocks.prepareSession(user.id, {
    userInfo: user.info,
  });

  session.allow(`liveblocks:examples:*`, ["*:write"]);

  const { status, body: token } = await session.authorize();
  return new NextResponse(token, { status });
}

async function getSessionUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session ? getDemoUser(session.user.id) : undefined;
}
