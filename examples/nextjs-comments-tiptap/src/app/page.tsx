import { createRoomWithContent } from "./actions";

export default async function Home() {
  await createRoomWithContent();
}
