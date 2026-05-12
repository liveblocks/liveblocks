import { redirect } from "next/navigation";
import { createRoom, getLatestRoom } from "./utils/liveblocks";
import { getPostUrl } from "./config";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const revalidate = 0;

export default async function Page() {
  const room = await getLatestRoom();

  if (!room) {
    const newRoom = await createRoom();
    redirect(getPostUrl(newRoom.metadata.postId));
  }

  redirect(getPostUrl(room.metadata.postId));
}
