"use client";

import { LiveblocksProvider, RoomProvider, useClient } from "@liveblocks/react";
import { ChatComposer, ChatMessages } from "@liveblocks/react-ui";
import { DebugClient } from "../DebugClient";

export default function Page() {
  const { messages } = useChatMessages();

  return (
    <main>
      <LiveblocksProvider
        authEndpoint="/api/liveblocks-auth"
        // @ts-expect-error
        baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
      >
        <DebugClient />
        <RoomProvider id="liveblocks:examples:ai">
          <ChatMessages messages={messages} className="messages" />

          <div className="composer-container">
            <ChatComposer chatId="ai" className="composer" />
          </div>
        </RoomProvider>
      </LiveblocksProvider>
    </main>
  );
}

function useChatMessages(): {
  isLoading: boolean;
  messages: (
    | {
      role: "user";
      id: string;
      chatId: string;
      content: (
        | { type: "text"; data: string }
        | {
          type: "image";
          id: string;
          name: string;
          size: number;
          mimeType: string;
        }
      )[];
    }
    | {
      role: "assistant";
      id: string;
      chatId: string;
      content: (
        | { type: "text"; id: string; data: string }
        | {
          type: "tool-call";
          id: string;
          name: string;
          args?: unknown;
        }
      )[];
    }
  )[];
  fetchMore: () => void;
  isFetchingMore: boolean;
  hasFetchedAll: boolean;
  fetchMoreError: Error | null;
} {
  return {
    isLoading: false,
    messages: [
      {
        role: "user",
        id: "1",
        chatId: "ai",
        content: [
          {
            type: "text",
            data: "Hello, what is the weather like in Bhaktapur, Nepal?",
          },
        ],
      },
      {
        role: "assistant",
        id: "2",
        chatId: "ai",
        content: [
          {
            type: "text",
            id: "2.1",
            data: "The weather in Bhaktapur, Nepal is 25°C and sunny. Would you like me to look up the weather in another location?",
          },
        ],
      },
      {
        role: "user",
        id: "3",
        chatId: "ai",
        content: [
          {
            type: "text",
            data: "Yes, what is the weather like in Kathmandu, Nepal?",
          },
          {
            type: "image",
            name: "weather.png",
            id: "at_V2zdp9w6KHe8GCQ99UbCX",
            mimeType: "image/png",
            size: 12345,
          },
        ],
      },
      {
        role: "assistant",
        id: "4",
        chatId: "ai",
        content: [
          {
            id: "4.1",
            type: "text",
            data: "The weather in Kathmandu, Nepal is 27°C and sunny. Would you like me to look up the weather in another location?",
          },
        ],
      },
      {
        role: "user",
        id: "5",
        chatId: "ai",
        content: [
          {
            type: "text",
            data: "Can you describe what the current weather is like in Lalitpur, Nepal? Also, what time is it in Bhaktapur, Nepal? And what are the top news in Nepal? Thank you!",
          },
        ],
      },
      {
        role: "assistant",
        id: "6",
        chatId: "ai",
        content: [
          {
            id: "6.1",
            type: "tool-call",
            name: "getTime",
            args: {
              city: "Bhaktapur",
              country: "Nepal",
            },
          },
        ],
      },
    ],
    fetchMore: () => { },
    isFetchingMore: false,
    hasFetchedAll: false,
    fetchMoreError: null,
  };
}
