import { Liveblocks } from "@liveblocks/node";
import { NextRequest } from "next/server";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

const COLORS = [
  "#E57373",
  "#9575CD",
  "#4FC3F7",
  "#81C784",
  "#FFF176",
  "#FF8A65",
  "#F06292",
  "#7986CB",
];

function getRandomColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export async function POST(request: NextRequest) {
  const userId = `user-${Math.random().toString(36).substring(2, 9)}`;

  const searchParams = request.nextUrl.searchParams;
  const userName = searchParams.get("name") || `User ${userId.slice(-4)}`;

  const session = liveblocks.prepareSession(userId, {
    userInfo: {
      name: userName,
      color: getRandomColor(userId),
      avatar: undefined,
    },
  });

  session.allow("doc-*", session.FULL_ACCESS);

  const { status, body } = await session.authorize();
  return new Response(body, { status });
}
