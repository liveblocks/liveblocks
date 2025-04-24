"use client";

import {
  ClientSideSuspense,
  RoomProvider,
  useClient,
  useChatMessages,
} from "@liveblocks/react/suspense";
import {
  AssistantChatMessage,
  AssistantMessageTextPartProps,
  ChatComposer,
  UserChatMessage,
} from "@liveblocks/react-ui";
import { useParams } from "next/navigation";
import { useState, Fragment } from "react";

import { ChatId, CopilotId, MessageId } from "@liveblocks/core";
import { useForceRerender } from "../../debugTools";

const PRESETS = [
  {
    title: "How's the weather?",
    prompt: "What's the current weather like in Tokyo, Japan?",
  },
  {
    title: "Generate a poem",
    prompt:
      "Tell me a short story about a TypeScript core developer lost on Venus.",
  },
  {
    title: "Baking instructions",
    prompt: "Give me a delicious apple pie recipe.",
  },
  {
    title: "Help me code",
    prompt: "Implement a Fibonnacci number generator in Rust.",
  },
];

export default function Page() {
  return (
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
  );
}

function ChatPicker() {
  // The user-selected chat ID. If nothing is explicitly selected (or the
  // selected chat ID isn't a valid one), the selected chat will be the first
  // one in the list.
  const selectedChatId = useParams<{ chatId: ChatId }>().chatId;
  return (
    <div className="chat-app-container">
      <ChatWindow chatId={selectedChatId} />
    </div>
  );
}

function ChatWindow({ chatId }: { chatId: ChatId }) {
  const [_, forceRerender] = useForceRerender();
  const client = useClient();

  const [branch, setBranch] = useState<MessageId | undefined>();
  const { messages } = useChatMessages(chatId, branch);

  const [selectedCopilotId, setSelectedCopilotId] = useState<
    CopilotId | undefined
  >();
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

  async function ask(text: string, parentMessageId: MessageId | null) {
    // Creates the user message
    const { message } = await client.ai.addUserMessage(
      chatId,
      parentMessageId,
      text
    );
    setBranch(undefined); // Show the latest message on screen

    // Creates the assistant response message
    await client.ai.ask(chatId, message.id, {
      copilotId: selectedCopilotId,
      stream: streaming,
      timeout: maxTimeout,
    });
  }

  return (
    <div className="chat-window-container">
      <div className="messages">
        {/*
        <details className="debug-raw-json">
          <summary>Raw JSON</summary>
          <pre>{JSON.stringify(messages, null, 2)}</pre>
        </details>
        */}
        <div className="lb-root lb-chat-messages">
          {messages.map((message) => (
            <Fragment key={message.id}>
              {message.role === "user" ? (
                <div className="user-message-container">
                  <UserChatMessage message={message} />
                  <div className="message-controls">
                    <button
                      style={{ color: "red" }}
                      onClick={async () => {
                        try {
                          await client.ai.deleteMessage(chatId, message.id);
                        } finally {
                          forceRerender();
                        }
                      }}
                    >
                      delete
                    </button>
                    {message.prev || message.next ? (
                      <button
                        onClick={() => {
                          if (message.next !== null) setBranch(message.next);
                        }}
                        style={{
                          cursor: message.next ? "pointer" : "not-allowed",
                          opacity: message.next ? undefined : 0.5,
                        }}
                        disabled={!message.next}
                      >
                        »
                      </button>
                    ) : null}
                    <button
                      onClick={async () => {
                        const answer = prompt(
                          "Edit",
                          message.content
                            .flatMap((b) => (b.type === "text" ? [b.text] : []))
                            .join(" ")
                        );
                        if (answer !== null) {
                          const result = await client.ai.addUserMessage(
                            chatId,
                            message.parentId,
                            answer
                          );
                          setBranch(undefined); // Show the latest message on screen

                          await client.ai.ask(chatId, result.message.id, {
                            copilotId: selectedCopilotId,
                            stream: streaming,
                            timeout: maxTimeout,
                          });
                        }
                      }}
                    >
                      edit
                    </button>
                    {message.prev || message.next ? (
                      <button
                        onClick={() => {
                          if (message.prev !== null) setBranch(message.prev);
                        }}
                        style={{
                          cursor: message.prev ? "pointer" : "not-allowed",
                          opacity: message.prev ? undefined : 0.5,
                        }}
                        disabled={!message.prev}
                      >
                        «
                      </button>
                    ) : null}
                    <button
                      onClick={async () => {
                        await client.ai.ask(chatId, message.id, {
                          copilotId: selectedCopilotId,
                          stream: streaming,
                          timeout: maxTimeout,
                        });
                      }}
                    >
                      regenerate
                    </button>
                    <span style={{ wordWrap: "normal" }}>{message.id}</span>
                  </div>
                </div>
              ) : message.role === "assistant" ? (
                <div className="assistant-message-container">
                  <AssistantChatMessage message={message} />
                  <div className="assistant-message-controls">
                    <span>{message.id}</span>
                    {message.prev || message.next ? (
                      <>
                        <button
                          onClick={() => {
                            if (message.prev !== null) setBranch(message.prev);
                          }}
                          style={{
                            cursor: message.prev ? "pointer" : "not-allowed",
                            opacity: message.prev ? undefined : 0.5,
                          }}
                          disabled={!message.prev}
                        >
                          «
                        </button>
                        <button
                          onClick={() => {
                            if (message.next !== null) setBranch(message.next);
                          }}
                          style={{
                            cursor: message.next ? "pointer" : "not-allowed",
                            opacity: message.next ? undefined : 0.5,
                          }}
                          disabled={!message.next}
                        >
                          »
                        </button>
                      </>
                    ) : null}
                    <button
                      style={{ color: "red" }}
                      onClick={async () => {
                        try {
                          await client.ai.deleteMessage(chatId, message.id);
                        } finally {
                          forceRerender();
                        }
                      }}
                    >
                      delete
                    </button>
                  </div>
                </div>
              ) : null}
            </Fragment>
          ))}
        </div>
      </div>

      <div className="composer-container">
        {messages.length === 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "20px",
              padding: "1rem",
            }}
          >
            {PRESETS.map((preset, index) => (
              <button
                key={index}
                onClick={() => ask(preset.prompt, lastMessageId)}
              >
                {preset.title}
              </button>
            ))}
          </div>
        ) : null}

        <ChatComposer
          chatId={chatId}
          className="composer"
          overrides={{
            CHAT_COMPOSER_PLACEHOLDER:
              messages.length > 0
                ? "Reply to your AI friend…"
                : "How can I help you today?",
          }}
          branchId={branch}
          copilotId={selectedCopilotId}
          stream={streaming}
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
      </div>
    </div>
  );
}
