import Editor from "./blocknote/editor";
import { Room } from "./room";

// This is a server-rendered page with a client-side collaborative text editor inside
// Learn how to structure your collaborative Next.js app
// https://liveblocks.io/docs/guides/how-to-use-liveblocks-with-nextjs-app-directory

export default function Page() {
  return (
    <Room>
      <Editor />
    </Room>
  );
}
