"use client";

import { LiveblocksProvider, RoomProvider } from "@liveblocks/react/suspense";
import { Composer } from "./composer";
import { ChatMessages } from "./message";
import { useLayoutEffect, useRef } from "react";

export default function Page() {
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const { isLoading, messages } = useChatMessages();

  useLayoutEffect(() => {
    if (messagesContainerRef.current === null) return;
    messagesContainerRef.current.scrollTo({
      top: messagesContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  return (
    <main>
      <LiveblocksProvider
        authEndpoint="/api/liveblocks-auth"
        // @ts-expect-error
        baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
      >
        <ChatMessages messages={messages} ref={messagesContainerRef} />

        <div className="composer-container">
          <Composer className="composer" />
        </div>
      </LiveblocksProvider>
    </main>
  );
}

function useChatMessages(): {
  isLoading: boolean;
  messages: (
    | { role: "user"; id: string; content: { text: string } }
    | {
      role: "assistant";
      id: string;
      content: (
        | { id: string; type: "text"; data: string }
        | { type: "tool-call"; id: string; name: string; arguments: unknown }
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
        content: {
          text: "Hello, what is the weather like in Bhaktapur, Nepal?",
        },
      },
      {
        role: "assistant",
        id: "2",
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
        content: {
          text: "Yes, what is the weather like in Kathmandu, Nepal?",
        },
      },
      {
        role: "assistant",
        id: "4",
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
        content: {
          text: "Can you describe what the current weather is like in Lalitpur, Nepal? Also, what time is it in Bhaktapur, Nepal? And what are the top news in Nepal? Thank you!",
        },
      },
      {
        role: "assistant",
        id: "6",
        content: [
          {
            id: "6.1",
            type: "tool-call",
            name: "getTime",
            arguments: {
              city: "Bhaktapur",
              country: "Nepal",
            },
          },
        ],
      },
      {
        role: "user",
        id: "7",
        content: {
          text: "You didn't answer my question about the weather in Lalitpur, Nepal. Can you also tell me the top news in Nepal?",
        },
      },
      {
        role: "assistant",
        id: "8",
        content: [
          {
            id: "8.1",
            type: "tool-call",
            name: "getNews",
            arguments: {
              country: "Nepal",
            },
          },
        ],
      },
      {
        role: "user",
        id: "9",
        content: {
          text: "What is the weather like in Pokhara, Nepal?",
        },
      },
      {
        role: "assistant",
        id: "10",
        content: [
          {
            id: "10.1",
            type: "text",
            data: "The weather in Pokhara, Nepal is 24°C and sunny. Would you like me to look up the weather in another location?",
          },
        ],
      },
      {
        role: "user",
        id: "11",
        content: {
          text: "How does the population of Nepal compare to that of Canada. What about the area of Nepal compared to the area of Canada?",
        },
      },
      {
        role: "assistant",
        id: "12",
        content: [
          {
            id: "12.1",
            type: "text",
            data: "The population of Nepal is 30 million, while the population of Canada is 38 million. The area of Nepal is 147,516 km², while the area of Canada is 9,984,670 km². Do you have any other questions?",
          },
        ],
      },
      {
        role: "user",
        id: "13",
        content: {
          text: "Help me visualize the ratio of the population of Nepal to the population of Canada and the ratio of the area of Nepal to the area of Canada.",
        },
      },
      {
        role: "assistant",
        id: "14",
        content: [
          {
            id: "14.1",
            type: "text",
            data: "The population of Nepal is 79% of the population of Canada. The area of Nepal is 1.5% of the area of Canada. This means that Nepal has a higher population density than Canada but a smaller total population and area. Do you have any other questions?",
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
