import { Liveblocks } from "@liveblocks/node";
import { redirect } from "next/navigation";
import { createRoom, getLatestRoom } from "./lib/liveblocks";

// Force the page to be dynamic and allow streaming responses up to 30 seconds for AI
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const revalidate = 0;

export const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export default async function Page() {
  const room = await getLatestRoom();

  if (!room) {
    const room = await createRoom();
    redirect(`/${room.metadata.pageId}`);
  }

  redirect(`/${room.metadata.pageId}`);
}
