/* eslint-disable */
// @ts-nocheck
import React from "react";
import { LiveblocksProvider } from "@liveblocks/react";
// import React from "react";

export default function Home() {
  return (
    <LiveblocksProvider authEndpoint="/api/auth">
      <div>App</div>
    </LiveblocksProvider>
  );
}
