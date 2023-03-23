import React from "react";
import { RoomProvider } from "../liveblocks.config";

export default function Page() {
  if (typeof RoomProvider === "undefined") {
    return <div>Not connected</div>
  }

  return <div>Connected to Liveblocks!</div>
}
