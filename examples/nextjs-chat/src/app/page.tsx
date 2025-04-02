"use client";

import { LiveblocksProvider, RoomProvider, useClient } from "@liveblocks/react";
import { ChatComposer, ChatMessages } from "@liveblocks/react-ui";
import { useEffect, useState } from "react";

import { DebugClient } from "../DebugClient";
import {
  AiChat,
  AiChatMessage,
  ChatId,
  ISODateString,
  MessageId,
} from "@liveblocks/core";
import { useForceRerender } from "./debugTools";

export default function Page() {
  return (
    <main>
      <LiveblocksProvider
        authEndpoint="/api/liveblocks-auth"
        // @ts-expect-error
        baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
      >
        <DebugClient />
        <RoomProvider id="liveblocks:examples:ai">
          <ChatPicker />
        </RoomProvider>
      </LiveblocksProvider>
    </main>
  );
}

function ChatPicker() {
  const [renderCount, forceRerender] = useForceRerender();

  const client = useClient();
  const { chats } = useChats_UNPOLISHED(renderCount);
  const [selectedChatId, setSelectedChatId] = useState<ChatId | undefined>(
    undefined
  );

  // Make sure the selected chat ID actually exists!
  const selectedChat = chats.find((chat) => chat.id === selectedChatId);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        <ul style={{ display: "flex", gap: "10px", listStyle: "none" }}>
          {chats.map((chat) => (
            <li key={chat.id}>
              <a
                href="#"
                onClick={() => {
                  setSelectedChatId(chat.id);
                }}
              >
                {chat.name}
              </a>
            </li>
          ))}
        </ul>
        <b>{selectedChat?.id}</b>
        <div>
          <button
            onClick={() => {
              const name = prompt("Enter a name for this chat?", "New chat");
              if (name !== null) {
                client.ai.newChat({ name }).finally(() => {
                  forceRerender();
                });
              }
            }}
          >
            Create new chat
          </button>
        </div>
      </div>
      {selectedChat ? <ChatWindow chatId={selectedChat.id} /> : null}
    </div>
  );
}

function ChatWindow(props: { chatId: ChatId }) {
  const [renderCount, forceRerender] = useForceRerender();

  const client = useClient();
  const { messages } = useChatMessages_UNPOLISHED(props.chatId, renderCount);
  return (
    <div>
      <ChatMessages
        chatId={props.chatId}
        messages={messages}
        className="messages"
      />

      <div className="composer-container">
        <ChatComposer
          chatId={props.chatId}
          className="composer"
          overrides={{
            CHAT_COMPOSER_PLACEHOLDER:
              messages.length > 0
                ? "Reply to your AI friend…"
                : "How can I help you today?",
          }}
          onSubmit={async (ev) => {
            if (ev.currentTarget.textContent?.trim()) {
              try {
                await client.ai.addUserMessage(
                  props.chatId,
                  ev.currentTarget.textContent.trim()
                );
                await client.ai.generateAnswer(props.chatId);
              } finally {
                forceRerender();
              }
            }
          }}
        />
      </div>
    </div>
  );
}

function useChats_UNPOLISHED(invalidator: number): {
  isLoading: boolean;
  chats: AiChat[];
  fetchMore: () => void;
  isFetchingMore: boolean;
  hasFetchedAll: boolean;
  fetchMoreError: Error | null;
} {
  const client = useClient();
  const [chats, setChats] = useState<AiChat[]>([]);

  // TODO This is not the best way to get the chats, but for now it helps to speed up iteration
  useEffect(() => {
    client.ai.listChats().then((resp) => {
      setChats([...resp.chats, EXAMPLE_CHAT]);
    });
  }, [invalidator]);

  return {
    isLoading: false,
    chats,
    fetchMore: () => {},
    isFetchingMore: false,
    hasFetchedAll: false,
    fetchMoreError: null,
  };
}

type UseChatMessagesResult = {
  isLoading: boolean;
  messages: AiChatMessage[];
  fetchMore: () => void;
  isFetchingMore: boolean;
  hasFetchedAll: boolean;
  fetchMoreError: Error | null;
};

const EXAMPLE_CHAT_ID: ChatId = "ch_example" as ChatId;
const EXAMPLE_CHAT: AiChat = {
  id: EXAMPLE_CHAT_ID,
  name: "Weather in Nepal",
  metadata: {},
  createdAt: "2025-05-01T00:00:00Z" as ISODateString,
};

const HARDCODED_EXAMPLE_MESSAGES: AiChatMessage[] = [
  {
    id: "msg_1" as MessageId,
    role: "user",
    status: "complete",
    content: [
      {
        type: "text",
        text: "Hello, what is the weather like in Bhaktapur, Nepal?",
      },
    ],
    createdAt: "2025-05-01T00:00:00Z" as ISODateString,
  },
  {
    id: "msg_2" as MessageId,
    role: "assistant",
    status: "complete",
    content: [
      {
        id: "2.1",
        type: "text",
        text: "The weather in Bhaktapur, Nepal is 25°C and sunny. Would you like me to look up the weather in another location?",
      },
    ],
    createdAt: "2025-05-01T00:00:00Z" as ISODateString,
  },
  {
    id: "msg_3" as MessageId,
    role: "user",
    status: "complete",
    content: [
      {
        type: "text",
        text: "Yes, what is the weather like in Kathmandu, Nepal?",
      },
      {
        type: "image",
        name: "weather.png",
        id: "at_V2zdp9w6KHe8GCQ99UbCX",
        mimeType: "image/png",
        size: 12345,
      },
    ],
    createdAt: "2025-05-01T00:00:00Z" as ISODateString,
  },
  {
    id: "msg_4" as MessageId,
    role: "assistant",
    status: "complete",
    content: [
      {
        id: "4.1",
        type: "text",
        text: "The weather in Kathmandu, Nepal is 27°C and sunny. Would you like me to look up the weather in another location?",
      },
    ],
    createdAt: "2025-05-01T00:00:00Z" as ISODateString,
  },
  {
    id: "msg_5" as MessageId,
    role: "user",
    status: "complete",
    content: [
      {
        type: "text",
        text: "Can you describe what the current weather is like in Lalitpur, Nepal? Also, what time is it in Bhaktapur, Nepal? And what are the top news in Nepal? Thank you!",
      },
    ],
    createdAt: "2025-05-01T00:00:00Z" as ISODateString,
  },
  {
    id: "msg_6" as MessageId,
    role: "assistant",
    status: "complete",
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
    createdAt: "2025-05-01T00:00:00Z" as ISODateString,
  },
];

function useChatMessages_UNPOLISHED(chatId: ChatId, invalidator: number) {
  const client = useClient();
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);

  useEffect(() => {
    if (chatId === EXAMPLE_CHAT_ID) {
      setMessages([...HARDCODED_EXAMPLE_MESSAGES]);
    } else {
      // Get the answers for real
      client.ai.getMessages(chatId).then((resp) => {
        setMessages([...resp.messages]);
      });
    }
    setIsLoading(false);
  }, [invalidator, client, chatId]);

  return {
    isLoading,
    messages,
    fetchMore: () => {},
    isFetchingMore: false,
    hasFetchedAll: false,
    fetchMoreError: null,
  } satisfies UseChatMessagesResult;
}
