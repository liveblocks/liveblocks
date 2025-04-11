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
import Markdown from "react-markdown";
import { useState } from "react";

import { AiChatMessage, ChatId, CopilotId, MessageId } from "@liveblocks/core";
import { useForceRerender } from "./debugTools";
import { TrashIcon } from "./icons";

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
    <div className="chat-app-container">
      <div className="chat-controls">
        <h1 className="logo">lbChat</h1>
        <button
          className="create-chat-btn"
          onClick={async () => {
            const name = prompt("Enter a name for this chat?", "New chat");
            if (name !== null) {
              const res = await client.ai.createChat(name);
              setUserSelectedChatId(res.chat.id);
            }
          }}
        >
          New Chat
        </button>

        <div className="chat-list">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`chat-list-item ${chat.id === selectedChatId ? "active" : ""}`}
              onClick={() => setUserSelectedChatId(chat.id)}
            >
              {chat.name}{" "}
              <button
                className="danger-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  client.ai.deleteChat(chat.id);
                }}
              >
                <TrashIcon />
              </button>
            </div>
          ))}

          {chats.length === 0 && (
            <div
              style={{ textAlign: "center", padding: "20px 0", color: "#777" }}
            >
              No chats yet. Create your first chat!
            </div>
          )}
        </div>

        {isFetchingMore ? (
          <div style={{ textAlign: "center", padding: "10px" }}>
            Loading more chats...
          </div>
        ) : (
          <button
            className="load-more-chats-btn"
            style={{
              cursor:
                isFetchingMore || hasFetchedAll ? "not-allowed" : "pointer",
              opacity: isFetchingMore || hasFetchedAll ? 0.5 : 1,
            }}
            onClick={fetchMore}
          >
            Load More Chats
          </button>
        )}
        {fetchMoreError && (
          <div style={{ color: "red", marginBottom: "10px" }}>
            Failed to get more: {fetchMoreError.message}
          </div>
        )}
      </div>

      {selectedChat ? (
        <ChatWindow chatId={selectedChat.id} />
      ) : (
        <div
          className="chat-window-container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{ textAlign: "center", maxWidth: "400px", padding: "20px" }}
          >
            <h2>Welcome to Liveblocks Chat</h2>
            <p>
              Select a chat from the sidebar or create a new one to get started.
            </p>
          </div>
        </div>
      )}
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
  const [maxTimeout, setMaxTimeout] = useState<number | undefined>(undefined);

  const handleCopilotChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.currentTarget.value;
    setSelectedCopilotId(
      value === "default" ? undefined : (value as CopilotId)
    );
  };

  const COPILOTS = [
    { id: "co_T6jQlhS", name: "Rhyme Maker (Anthropic, Sonnet 3.5)" },
    { id: "co_gblzUtw", name: "Wrong Answers Only (OpenAI, gpt-4o)" },
    { id: "co_6ftW85o", name: "The Comedian (Google, Gemini Flash 2.0)" },
    {
      id: "co_r3a5on1",
      name: "Deep Thinker (Anthropic, Sonnet 3.7-Reasoning)",
    },
    { id: "co_lm5tud10", name: "LM Studio (Deepseek Qwen 7b Distilled)" },
  ];

  const lastMessageId =
    messages.length > 0 ? messages[messages.length - 1].id : null;

  function messageAbove(messageId: MessageId): AiChatMessage | undefined {
    return messages[messages.findIndex((msg) => msg.id === messageId) - 1];
  }

  const parentMessageId = overrideParentId ?? lastMessageId;
  return (
    <div className="chat-window-container">
      <div className="messages">
        <details className="debug-raw-json">
          <summary>Raw JSON</summary>
          <pre>{JSON.stringify(messages, null, 2)}</pre>
        </details>
        <ChatMessages
          messages={messages}
          components={{
            // Add bells and whistles to the default chat components
            UserChatMessage: (props) => (
              <div className="user-message-container">
                <UserChatMessage {...props} />
                <div className="message-controls">
                  <button
                    style={{ color: "red" }}
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
                    onClick={async () => {
                      const answer = prompt(
                        "Edit",
                        props.message.content
                          .flatMap((b) => (b.type === "text" ? [b.text] : []))
                          .join(" ")
                      );
                      if (answer !== null) {
                        try {
                          const { message } = await client.ai.attachUserMessage(
                            chatId,
                            messageAbove(props.message.id)?.id ?? null,
                            answer
                          );
                          forceRerender();

                          await client.ai.ask(chatId, message.id, {
                            copilotId: selectedCopilotId,
                            stream: streaming,
                            timeout: maxTimeout,
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
                    onClick={async () => {
                      try {
                        await client.ai.ask(chatId, props.message.id, {
                          copilotId: selectedCopilotId,
                          stream: streaming,
                          timeout: maxTimeout,
                        });
                      } finally {
                        setOverrideParentId(undefined);
                      }
                    }}
                  >
                    regenerate
                  </button>
                  <button onClick={() => setOverrideParentId(props.message.id)}>
                    {props.message.id}
                  </button>
                </div>
              </div>
            ),
            // Add bells and whistles to the default chat components
            AssistantChatMessage: (props) => (
              <div className="assistant-message-container">
                <AssistantChatMessage
                  {...props}
                  components={{
                    TextPart: (props) => (
                      <div className="lb-root lb-assistant-chat-message-text-content">
                        <Markdown>{props.text}</Markdown>
                      </div>
                    ),
                  }}
                />
                <div className="assistant-message-controls">
                  <button onClick={() => setOverrideParentId(props.message.id)}>
                    {props.message.id}
                  </button>
                  <button
                    style={{ color: "red" }}
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
                </div>
              </div>
            ),
          }}
        />
      </div>

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
                const { message } = await client.ai.attachUserMessage(
                  chatId,
                  parentMessageId,
                  ev.currentTarget.textContent.trim()
                );
                forceRerender();

                await client.ai.ask(chatId, message.id, {
                  copilotId: selectedCopilotId,
                  stream: streaming,
                  timeout: maxTimeout,
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
            justifyContent: "center",
            flexWrap: "wrap",
            gap: ".7rem",
            width: "100%",
            margin: "1rem 0 0 0",
          }}
        >
          <button
            className="danger-btn"
            style={{
              border: "1px solid #888",
            }}
            onClick={(e) => {
              e.stopPropagation();
              client.ai.clearChat(chatId);
            }}
          >
            Clear
          </button>
          <select
            value={selectedCopilotId || "default"}
            onChange={handleCopilotChange}
            style={{
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
          <select
            value={maxTimeout}
            onChange={(ev) => {
              const value = ev.currentTarget.value;
              setMaxTimeout(value === "default" ? undefined : Number(value));
            }}
            style={{
              border: "2px solid #888",
              borderRadius: "6px",
              backgroundColor: "white",
              padding: "10px 1rem",
            }}
          >
            <option value="default">30s (default)</option>
            {[10_000, 5_000, 2_000, 1_000].map((t) => (
              <option key={t} value={t}>
                {t / 1000}s
              </option>
            ))}
          </select>
          <label
            style={{
              display: "flex",
              alignItems: "center",
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
        <div
          style={{
            fontSize: "0.8rem",
            textAlign: "center",
            width: "100%",
            margin: "1rem 0 0 0",
          }}
        >
          The next message will be{" "}
          {parentMessageId === null ? (
            <>a new root message.</>
          ) : (
            <>
              attached under <b>{parentMessageId}</b>.
            </>
          )}
        </div>
      </div>
    </div>
  );
}
