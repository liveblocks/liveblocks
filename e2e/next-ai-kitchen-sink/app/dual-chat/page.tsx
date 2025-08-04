"use client";

import { LiveblocksProvider } from "@liveblocks/react";
import { AiChat } from "@liveblocks/react-ui";
import { useState } from "react";

function ChatWithKnowledge() {
  const [favoritePasta, setFavoritePasta] = useState("Spaghetti Carbonara");

  return (
    <div className="w-1/2 h-full border-r border-gray-300 p-4">
      <h2 className="text-xl font-bold mb-4">Chat A (with local knowledge)</h2>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          My favorite pasta is:
        </label>
        <input
          type="text"
          value={favoritePasta}
          onChange={(e) => setFavoritePasta(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
          data-testid="chat-a-knowledge-input"
        />
      </div>

      <div className="h-96" data-testid="chat-a">
        <AiChat
          chatId="chat-a"
          className="h-full border border-gray-200 rounded"
          knowledge={[
            { description: "My favorite pasta", value: favoritePasta },
          ]}
        />
      </div>
    </div>
  );
}

function ChatWithoutKnowledge() {
  return (
    <div className="w-1/2 h-full p-4">
      <h2 className="text-xl font-bold mb-4">Chat B (no knowledge)</h2>

      <div className="mb-4">
        <p className="text-sm text-gray-600">
          This chat should NOT have access to chat A&apos;s knowledge
        </p>
      </div>

      <div className="h-96" data-testid="chat-b">
        <AiChat
          chatId="chat-b"
          className="h-full border border-gray-200 rounded"
        />
      </div>
    </div>
  );
}

export default function DualChatPage() {
  return (
    <LiveblocksProvider
      authEndpoint="/api/auth/liveblocks"
      // @ts-expect-error
      baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
    >
      <main className="h-screen w-full">
        <div className="h-full flex">
          <ChatWithKnowledge />
          <ChatWithoutKnowledge />
        </div>
      </main>
    </LiveblocksProvider>
  );
}
