// "use client";

import React from "react";
import { RoomProvider } from "../../../../liveblocks.config";
import { ClientSideSuspense } from "@liveblocks/react";
import { Loading } from "../../../components/Loading";
import { Example } from "./Example";

export default function Home() {
  return (
    <RoomProvider id="nextjs-comments" initialPresence={{}}>
      <ClientSideSuspense fallback={<Loading />}>
        {() => <Example />}
      </ClientSideSuspense>
    </RoomProvider>
  );
}
