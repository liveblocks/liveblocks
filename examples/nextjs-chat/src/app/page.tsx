"use client";

import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
  useClient,
  useCopilotChats,
  useCopilotChatMessages,
} from "@liveblocks/react/suspense";
import { ChatComposer, ChatMessages } from "@liveblocks/react-ui";
import { useEffect, useState } from "react";

import { DebugClient } from "../DebugClient";
import {
  AiChat,
  AiChatMessage,
  ChatId,
  CopilotId,
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
        <ClientSideSuspense
          fallback={
            <div
              style={{
                display: "flex",
                height: "100%",
                width: "100%",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Loading...
            </div>
          }
        >
          <DebugClient />
          <RoomProvider id="liveblocks:examples:ai">
            <ChatPicker />
          </RoomProvider>
        </ClientSideSuspense>
      </LiveblocksProvider>
    </main>
  );
}

function ChatPicker() {
  const client = useClient();
  const { chats, fetchMore, isFetchingMore, fetchMoreError, hasFetchedAll } =
    useCopilotChats();
  const [selectedChatId, setSelectedChatId] = useState<ChatId | undefined>(
    chats[0]?.id
  );

  if (selectedChatId === undefined && chats.length > 0) {
    //setSelectedChatId(chats[0].id);
  }

  if (chats.length === 0) {
    //setSelectedChatId(undefined);
  }

  // Make sure the selected chat ID actually exists!
  const selectedChat = chats.find((chat) => chat.id === selectedChatId);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        height: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "0 20px",
          margin: "0 auto",
        }}
      >
        <ul
          style={{
            display: "flex",
            gap: "10px",
            listStyle: "none",
            padding: 0,
          }}
        >
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

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            style={{
              all: "unset",
              cursor: "pointer",
            }}
            onClick={() => {
              const name = prompt("Enter a name for this chat?", "New chat");
              if (name !== null) {
                client.ai.newChat(name);
              }
            }}
          >
            Create new chat
          </button>

          <button
            style={{
              all: "unset",
              cursor:
                isFetchingMore || hasFetchedAll ? "not-allowed" : "pointer",
              opacity: isFetchingMore || hasFetchedAll ? 0.5 : 1,
            }}
            onClick={fetchMore}
            disabled={isFetchingMore || hasFetchedAll}
          >
            {isFetchingMore ? "…" : "Load more"}
          </button>

          <div>
            {fetchMoreError && (
              <div>Failed to get more: ${fetchMoreError.message}</div>
            )}
          </div>
        </div>
      </div>

      {selectedChat ? <ChatWindow chatId={selectedChat.id} /> : null}
    </div>
  );
}

function ChatWindow({ chatId }: { chatId: ChatId }) {
  const [renderCount, forceRerender] = useForceRerender();
  const client = useClient();
  const { messages } = useCopilotChatMessages(chatId);

  const [overrideParentId, setOverrideParentId] = useState<
    MessageId | undefined
  >(undefined);

  const [selectedCopilotId, setSelectedCopilotId] = useState<CopilotId | undefined>(undefined);

  const handleCopilotChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedCopilotId(value === "default" ? undefined : value as CopilotId);
  };

  const COPILOTS = [
    { id: "co_T6jQlhS", name: "Rhyme Maker (anthropic)" },
    { id: "co_gblzUtw", name: "Wrong Answers Only (openAI)" }
  ];


  const lastMessageId =
    messages.length > 0 ? messages[messages.length - 1].id : null;

  const parentMessageId = overrideParentId ?? lastMessageId;
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <ChatMessages chatId={chatId} messages={messages} className="messages" />

      <div className="composer-container">
        <ChatComposer
          chatId={chatId}
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
                const { messageId } = await client.ai.attachUserMessage(
                  chatId,
                  parentMessageId,
                  ev.currentTarget.textContent.trim()
                );
                forceRerender();
                await client.ai.generateAnswer(chatId, messageId, selectedCopilotId);
              } finally {
                setOverrideParentId(undefined);
              }
            }
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", margin: "1rem 3rem" }}>
          <select
            value={selectedCopilotId || "default"}
            onChange={handleCopilotChange}
            style={{
              width: "30%",
              border: "2px solid #888",
              borderRadius: "6px",
              backgroundColor: "white",
              padding: "10px 1rem",
            }}
          >
            <option value="default">Default</option>
            {COPILOTS.map(option => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
          <input
            style={{
              width: "70%",
              border: "2px solid #888",
              borderRadius: "6px",
              backgroundColor: "white",
              padding: "10px 1rem",
              marginLeft: "1rem",
            }}
            type="text"
            onChange={(ev) =>
              setOverrideParentId(
                (ev.currentTarget.value || undefined) as MessageId | undefined
              )
            }
            value={overrideParentId}
            placeholder="Attach to which message?"
          />
        </div>

      </div>
    </div>
  );
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
