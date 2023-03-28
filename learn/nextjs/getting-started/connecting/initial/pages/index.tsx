import LiveblocksDemo from "../components/LiveblocksDemo";
import React from "react";
import { RoomProvider } from "../liveblocks.config";
import Connected from "../components/Connected";

export default function Page() {
  if (typeof RoomProvider === "undefined") {
    return <Connected connected={false} />;
  }

  return <LiveblocksDemo />;
}
