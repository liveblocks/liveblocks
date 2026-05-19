import { NextResponse } from "next/server";

import { auth } from "@/auth/manager";
import { liveblocks, ROOM_PREFIX } from "@/lib/liveblocks-server";
import { ownerIdFromSession } from "@/lib/session-user";

export async function POST() {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const userSession = await auth();
  const ownerId = ownerIdFromSession(userSession);

  if (!ownerId) {
    return new NextResponse("Not signed in", { status: 401 });
  }

  const session = liveblocks.prepareSession(ownerId, {
    userInfo: {
      name: userSession!.user.name ?? userSession!.user.githubLogin ?? ownerId,
      picture: userSession!.user.image ?? "",
      color: pickColor(ownerId),
    },
  });

  // Only allow access to rooms namespaced under this user's ownerId.
  session.allow(`${ROOM_PREFIX}:${ownerId}:*`, session.FULL_ACCESS);

  const { status, body } = await session.authorize();
  return new NextResponse(body, { status });
}

const COLORS = [
  "#D583F0",
  "#F08385",
  "#F0D885",
  "#85EED6",
  "#85BBF0",
  "#8594F0",
  "#85DBF0",
  "#87EE85",
];

function pickColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}
