// "use client";

import React, { Suspense } from "react";
import { RoomProvider } from "../../../../liveblocks.config";
import { Example } from "./Example";
import { Loading } from "../../../components/Loading";

export default function Home() {
  return (
    <RoomProvider id="nextjs-comments" initialPresence={{}}>
      <Suspense fallback={<Loading />}>
        <Example />
      </Suspense>
    </RoomProvider>
  );
}
