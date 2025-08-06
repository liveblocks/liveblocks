import { createRoomWithContent } from "./actions";
import { redirect } from "next/navigation";

export default async function Home() {
  const roomId = await createRoomWithContent();
  redirect(`/${roomId}`);
}
