"use client";

import { LiveblocksProvider, RegisterAiKnowledge } from "@liveblocks/react";
import { AiChat } from "@liveblocks/react-ui";
import { useState } from "react";

function ChatWithLocalKnowledge() {
  const [localKnowledge, setLocalKnowledge] = useState("Spaghetti Carbonara");

  return (
    <div className="w-1/2 h-full border-r border-gray-300 p-4">
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
        <label className="block text-sm font-medium mb-2 text-blue-700">
          My favorite pasta dish:
        </label>
        <input
          type="text"
          value={localKnowledge}
          onChange={(e) => setLocalKnowledge(e.target.value)}
          className="w-full p-2 border border-blue-300 rounded bg-blue-50"
          data-testid="chat-a-knowledge-input"
        />
        <p className="text-xs text-blue-600 mt-3">
          This knowledge is passed via the <code>knowledge</code> prop to chat A
          only.
        </p>
      </div>

      <h2 className="text-xl font-bold mb-4">Chat A</h2>
      <div className="h-80" data-testid="chat-a">
        <AiChat
          chatId="chat-a"
          className="h-full border border-gray-200 rounded"
          knowledge={[
            { description: "My favorite pasta dish", value: localKnowledge },
          ]}
        />
      </div>
    </div>
  );
}

function ChatWithoutLocalKnowledge() {
  return (
    <div className="w-1/2 h-full p-4">
      <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg mb-4">
        <h3 className="text-sm font-semibold mb-2 text-gray-800 h-12">
          No local knowledge
        </h3>
        <p className="text-sm text-gray-600">
          This chat has no additional local knowledge passed via props. It can
          only access the global knowledge.
        </p>
      </div>

      <h2 className="text-xl font-bold mb-4">Chat B</h2>
      <div className="h-80" data-testid="chat-b">
        <AiChat
          chatId="chat-b"
          className="h-full border border-gray-200 rounded"
        />
      </div>
    </div>
  );
}

export default function DualChatPage() {
  const [globalKnowledge, setGlobalKnowledge] = useState("Tiramisu");

  return (
    <LiveblocksProvider
      authEndpoint="/api/auth/liveblocks"
      // @ts-expect-error
      baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
    >
      {/* Global knowledge that should be accessible to ALL chat instances */}
      <RegisterAiKnowledge
        description="My favorite dessert"
        value={globalKnowledge}
      />

      <main className="h-screen w-full flex flex-col">
        <div className="bg-yellow-50 border-b border-yellow-200 p-4">
          <h1 className="text-2xl font-bold mb-2">Knowledge Isolation Test</h1>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-yellow-800">
              My favorite dessert:
            </label>
            <input
              type="text"
              value={globalKnowledge}
              onChange={(e) => setGlobalKnowledge(e.target.value)}
              className="w-full p-2 border border-yellow-300 rounded bg-yellow-50"
              data-testid="global-knowledge-input"
            />
            <p className="text-sm text-yellow-700 mt-1">
              This knowledge is registered via{" "}
              <code>&lt;RegisterAiKnowledge /&gt;</code> and should be
              accessible to both chat A and B.
            </p>
          </div>
        </div>

        <div className="flex-1 flex">
          <ChatWithLocalKnowledge />
          <ChatWithoutLocalKnowledge />
        </div>
      </main>
    </LiveblocksProvider>
  );
}
