import { Suspense } from "react";

import { Room } from "./_components/room";
import Editor from "./_editor/editor";

// Learn how to implement notification settings in this file:
// /app/settings/_components/user-notifications-settings.tsx

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Room>
        <Editor />
      </Room>
    </Suspense>
  );
}
