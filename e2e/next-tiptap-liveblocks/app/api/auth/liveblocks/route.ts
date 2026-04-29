import { Liveblocks } from "@liveblocks/node";
import { NextResponse } from "next/server";

const USERS = [
  {
    id: "tiptap-user-0",
    info: {
      name: "Ada Lovelace",
      color: "#e11d48",
      avatar: "https://liveblocks.io/avatars/avatar-0.png",
    },
  },
  {
    id: "tiptap-user-1",
    info: {
      name: "Grace Hopper",
      color: "#2563eb",
      avatar: "https://liveblocks.io/avatars/avatar-1.png",
    },
  },
  {
    id: "tiptap-user-2",
    info: {
      name: "Katherine Johnson",
      color: "#16a34a",
      avatar: "https://liveblocks.io/avatars/avatar-2.png",
    },
  },
];

export async function POST() {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY,
    baseUrl: process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL,
  });

  const user = USERS[Math.floor(Math.random() * USERS.length)];
  const session = liveblocks.prepareSession(user.id, {
    userInfo: user.info,
  });

  session.allow("e2e-tiptap-*", session.FULL_ACCESS);
  session.allow("liveblocks:e2e:tiptap:*", session.FULL_ACCESS);

  const { status, body } = await session.authorize();
  return new NextResponse(body, { status });
}
