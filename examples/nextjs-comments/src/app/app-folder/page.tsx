// "use client";

import React from "react";
import { RoomProvider } from "../../../liveblocks.config";
import { Example } from "./Example";

export default function Home() {
  return (
    <RoomProvider id="nextjs-comments" initialPresence={{}}>
      <Example />
    </RoomProvider>
  );
}
