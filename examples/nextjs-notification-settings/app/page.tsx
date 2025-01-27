import { Suspense } from "react";

import { Room } from "./_components/room";
import Editor from "./_editor/editor";

// Learn how to structure your collaborative Next.js app
// https://liveblocks.io/docs/guides/how-to-use-liveblocks-with-nextjs-app-directory

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Room>
        <Editor />
      </Room>
    </Suspense>
  );
}
