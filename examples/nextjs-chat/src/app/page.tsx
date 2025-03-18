"use client";

import { LiveblocksProvider } from "@liveblocks/react/suspense";
import { Composer } from "./chat";

export default function Page() {
  return (
    <main>
      <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
        <div className="messages-container"></div>
        <div className="chat-form-container">
          <Composer className="chat-composer" />
        </div>
      </LiveblocksProvider>
    </main>
  );
}
