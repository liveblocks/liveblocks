import { redirect } from "next/navigation";
import { createRoom, getLatestRoom } from "./utils/liveblocks";
import { getPageUrl } from "./config";

// Force the page to be dynamic and allow streaming responses up to 30 seconds for AI
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const revalidate = 0;

export default async function Page() {
  const room = await getLatestRoom();

  if (!room) {
    const newRoom = await createRoom();
    redirect(getPageUrl(newRoom.id));
  }

  redirect(getPageUrl(room.id));
}
