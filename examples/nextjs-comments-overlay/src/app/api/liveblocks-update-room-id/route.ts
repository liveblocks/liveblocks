import { Liveblocks } from "@liveblocks/node";
import { NextRequest } from "next/server";

// Authenticating your Liveblocks application
// https://liveblocks.io/docs/rooms/authentication/access-token-permissions/nextjs

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
  // @ts-expect-error - Hidden config option
  baseUrl: "https://dev.dev-liveblocks5948.workers.dev/",
});

export async function POST(request: NextRequest) {
  const { newRoomI, roomId } = await request.json();

  // @ts-expect-error
  const updatedRoom = await liveblocks.updateRoomId({
    roomId,
    newRoomId: newRoomI,
  });

  return new Response(updatedRoom, { status: 200 });
}
