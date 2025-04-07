"use client";

import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
  useClient,
  useCopilotChats,
  useCopilotChatMessages,
} from "@liveblocks/react/suspense";
import {
  AssistantChatMessage,
  ChatComposer,
  ChatMessages,
  UserChatMessage,
} from "@liveblocks/react-ui";
import { useState } from "react";

import { DebugClient } from "../DebugClient";
import {
  AiChat,
  AiChatMessage,
  AiPlaceholderChatMessage,
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

  // The user-selected chat ID. If nothing is explicitly selected (or the
  // selected chat ID isn't a valid one), the selected chat will be the first
  // one in the list.
  const [selectedChatId, setUserSelectedChatId] = useState<ChatId | undefined>(
    chats[0]?.id
  );
  const selectedChat = chats.find((chat) => chat.id === selectedChatId);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        height: "100%",
        padding: "20px 0",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "0 20px",
          margin: "0 auto",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            style={{
              all: "unset",
              cursor: "pointer",
            }}
            onClick={() => {
              const name = prompt("Enter a name for this chat?", "New chat");
              if (name !== null) {
                client.ai.createChat(name);
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
        <ul
          style={{
            display: "flex",
            gap: "10px",
            listStyle: "none",
            padding: 0,
            margin: 0,
          }}
        >
          {chats.map((chat) => (
            <li key={chat.id}>
              <a
                href="#"
                onClick={() => {
                  setUserSelectedChatId(chat.id);
                }}
              >
                {chat.name}
              </a>
            </li>
          ))}
        </ul>

        {selectedChat ? (
          <div style={{ display: "flex", gap: "20px" }}>
            <button
              style={{
                all: "unset",
                cursor: "pointer",
                color: "red",
              }}
              onClick={() => {
                if (confirm("This will wipe all messages! Are you sure?")) {
                  client.ai.clearChat(selectedChat.id);
                }
              }}
            >
              Clear this chat
            </button>

            <button
              style={{
                all: "unset",
                cursor: "pointer",
                color: "red",
              }}
              onClick={() => {
                if (confirm(`Are you sure to delete '${selectedChat.name}'?`)) {
                  client.ai.deleteChat(selectedChat.id);
                }
              }}
            >
              Delete this chat
            </button>
          </div>
        ) : null}
      </div>

      {selectedChat ? <ChatWindow chatId={selectedChat.id} /> : null}
    </div>
  );
}

function ChatWindow({ chatId }: { chatId: ChatId }) {
  const [_, forceRerender] = useForceRerender();
  const client = useClient();
  const { messages } = useCopilotChatMessages(chatId);

  const [overrideParentId, setOverrideParentId] = useState<
    MessageId | undefined
  >(undefined);

  const [selectedCopilotId, setSelectedCopilotId] = useState<
    CopilotId | undefined
  >("co_T6jQlhS" as CopilotId);
  const [streaming, setStreaming] = useState(true);

  const handleCopilotChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedCopilotId(
      value === "default" ? undefined : (value as CopilotId)
    );
  };

  const COPILOTS = [
    { id: "co_T6jQlhS", name: "Rhyme Maker (Anthropic, Sonnet 3.5)" },
    { id: "co_gblzUtw", name: "Wrong Answers Only (OpenAI, gpt-4o)" },
    { id: "co_6ftW85o", name: "The Comedian (Google, Gemini Flash 2.0)" },
  ];

  const lastMessageId =
    messages.length > 0 ? messages[messages.length - 1].id : null;

  function messageAbove(
    messageId: MessageId
  ): (AiChatMessage | AiPlaceholderChatMessage) | undefined {
    return messages[messages.findIndex((msg) => msg.id === messageId) - 1];
  }

  const parentMessageId = overrideParentId ?? lastMessageId;
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <ChatMessages
        chatId={chatId}
        messages={messages}
        className="messages"
        components={{
          // Add bells and whistles to the default chat components
          UserChatMessage: (props) => (
            <div
              style={{
                borderBottom: "0.5px solid #efefef",
                borderRight: "4px solid #efefef",
                borderRadius: "6px",
                padding: "1rem",
              }}
            >
              <UserChatMessage {...props} />
              <div
                style={{
                  display: "flex",
                  flexDirection: "row-reverse",
                  gap: "20px",
                  padding: "0 5rem",
                  fontSize: "0.75rem",
                  opacity: 0.8,
                }}
              >
                <button
                  style={{ all: "unset", cursor: "pointer", color: "red" }}
                  onClick={async () => {
                    try {
                      await client.ai.deleteMessage(chatId, props.message.id);
                    } finally {
                      forceRerender();
                    }
                  }}
                >
                  delete
                </button>
                <button
                  style={{ all: "unset", cursor: "pointer" }}
                  onClick={async () => {
                    const answer = prompt(
                      "Edit",
                      props.message.content
                        .flatMap((b) => (b.type === "text" ? [b.text] : []))
                        .join(" ")
                    );
                    if (answer !== null) {
                      try {
                        const { messageId } = await client.ai.attachUserMessage(
                          chatId,
                          messageAbove(props.message.id)?.id ?? null,
                          answer
                        );
                        forceRerender();

                        await client.ai.ask(chatId, messageId, {
                          copilotId: selectedCopilotId,
                          stream: streaming,
                        });
                      } finally {
                        setOverrideParentId(undefined);
                      }
                    }
                  }}
                >
                  edit
                </button>
                <button
                  style={{ all: "unset", cursor: "pointer" }}
                  onClick={async () => {
                    try {
                      await client.ai.ask(chatId, props.message.id, {
                        copilotId: selectedCopilotId,
                        stream: streaming,
                      });
                    } finally {
                      setOverrideParentId(undefined);
                    }
                  }}
                >
                  regenerate
                </button>
                <button
                  style={{
                    all: "unset",
                    cursor: "pointer",
                  }}
                  onClick={() => setOverrideParentId(props.message.id)}
                >
                  {props.message.id}
                </button>
              </div>
            </div>
          ),
          // Add bells and whistles to the default chat components
          AssistantChatMessage: (props) => (
            <div
              style={{
                borderBottom: "0.5px solid #efefef",
                borderLeft: "4px solid #efefef",
                borderRadius: "6px",
                padding: "1rem",
              }}
            >
              <AssistantChatMessage {...props} />
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: "20px",
                  padding: "0 5rem",
                  fontSize: "0.75rem",
                  opacity: 0.8,
                }}
              >
                <button
                  style={{
                    all: "unset",
                    cursor: "pointer",
                  }}
                  onClick={() => setOverrideParentId(props.message.id)}
                >
                  {props.message.id}
                </button>
                <button
                  style={{
                    all: "unset",
                    cursor: "pointer",
                    color: "red",
                  }}
                  onClick={async () => {
                    if (confirm("Are you sure?")) {
                      try {
                        await client.ai.deleteMessage(chatId, props.message.id);
                      } finally {
                        forceRerender();
                      }
                    }
                  }}
                >
                  delete
                </button>
              </div>
            </div>
          ),
        }}
      />

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

                await client.ai.ask(chatId, messageId, {
                  copilotId: selectedCopilotId,
                  stream: streaming,
                });
              } finally {
                setOverrideParentId(undefined);
              }
            }
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            margin: "1rem 3rem",
          }}
        >
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
            {COPILOTS.map((option) => (
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
          <label
            style={{
              display: "flex",
              alignItems: "center",
              marginLeft: "10px",
            }}
          >
            <input
              type="checkbox"
              checked={streaming}
              onChange={(ev) => setStreaming(ev.currentTarget.checked)}
            />{" "}
            Streaming
          </label>
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
