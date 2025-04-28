"use client";

import {
  AiAssistantMessage,
  AiUserMessage,
  MessageId,
  UiChatMessage,
} from "@liveblocks/core";
import { ChatComposer } from "@liveblocks/react-ui";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  useClient,
  useChatMessages,
  useCopilotChats,
} from "@liveblocks/react/suspense";
import Image from "next/image";
import { createContext, memo, useContext, useState } from "react";
import { Markdown } from "./markdown";

export default function Home() {
  return (
    <main className="h-screen w-full">
      <LiveblocksProvider
        authEndpoint="/api/auth/liveblocks"
        // @ts-expect-error
        baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
      >
        <ClientSideSuspense
          fallback={
            <div className="h-full w-full flex items-center justify-center">
              <Image
                src="https://liveblocks.io/loading.svg"
                alt="Loading"
                width={64}
                height={64}
                className="opacity-20"
              />
            </div>
          }
        >
          <App />
        </ClientSideSuspense>
      </LiveblocksProvider>
    </main>
  );
}

const BranchContext = createContext<{
  branch: MessageId | undefined;
  onBranchChange: (branchId: MessageId | undefined) => void;
} | null>(null);
function App() {
  const { chats } = useCopilotChats();
  if (chats.length === 0) throw new Error("No chats found");
  const chatId = chats[0].id;

  const [branch, setBranch] = useState<MessageId | undefined>(undefined);
  const { messages } = useChatMessages(chatId, branch);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex flex-col flex-1 overflow-y-auto gap-4 p-4">
        <BranchContext.Provider value={{ branch, onBranchChange: setBranch }}>
          {messages.map((message) => {
            if (message.role === "user") {
              return <UserMessage message={message} key={message.id} />;
            } else if (message.role === "assistant") {
              return <AssistantMessage message={message} key={message.id} />;
            }
          })}
        </BranchContext.Provider>
      </div>

      <div className="pb-4 px-4">
        <ChatComposer
          chatId={chatId}
          branchId={branch}
          className="rounded-lg mx-auto w-full max-w-[896px] shadow-[0_0_1px_rgb(0_0_0/4%),0_2px_6px_rgb(0_0_0/4%),0_8px_26px_rgb(0_0_0/6%)]"
        />
      </div>
    </div>
  );
}

const UserMessage = memo(function UserMessage({
  message,
}: {
  message: UiChatMessage & AiUserMessage;
}) {
  const client = useClient();
  const text = message.deletedAt ? (
    <i>This message has been deleted.</i>
  ) : (
    message.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n")
  );

  return (
    <div className="flex flex-col items-end w-full max-w-[896px] mx-auto p-2">
      <div className="flex gap-2">
        <BranchControls message={message} />
        <button
          onClick={() => {
            client.ai.ask(message.chatId, message.id, { stream: true });
          }}
        >
          Regenerate
        </button>
        <button
          onClick={() => {
            client.ai.deleteMessage(message.chatId, message.id);
          }}
        >
          Delete
        </button>
      </div>
      <pre>{message.id}</pre>
      <div className="max-w-[80%]">{text}</div>
    </div>
  );
});

const AssistantMessage = memo(function AssistantMessage({
  message,
}: {
  message: UiChatMessage & AiAssistantMessage;
}) {
  const client = useClient();

  if (message.deletedAt) {
    return (
      <div className="flex flex-col items-start w-full max-w-[896px] mx-auto p-2">
        <div className="flex gap-2">
          <BranchControls message={message} />
        </div>
        <pre>{message.id}</pre>
        <i>This message has been deleted.</i>
      </div>
    );
  } else if (message.status === "pending") {
    return (
      <div className="flex flex-col items-start w-full max-w-[896px] mx-auto p-2">
        <div className="flex gap-2">
          <BranchControls message={message} />
        </div>
        <pre>{message.id}</pre>
        {message.contentSoFar.length === 0 ? (
          <i>Generating response...</i>
        ) : (
          message.contentSoFar.map((part, index) => {
            if (part.type === "text") {
              return (
                <div key={index}>
                  <Markdown content={part.text} />
                </div>
              );
            } else if (part.type === "reasoning") {
              return (
                <div key={index} className="text-slate-500">
                  {part.text}
                </div>
              );
            } else if (part.type === "tool-call") {
              return (
                <div key={index} className="text-blue-500">
                  {part.toolName} - {JSON.stringify(part.args)}
                </div>
              );
            }
          })
        )}
      </div>
    );
  } else if (message.status === "failed") {
    return (
      <div className="flex flex-col items-start w-full max-w-[896px] mx-auto p-2">
        <div className="flex gap-2">
          <BranchControls message={message} />
        </div>
        <pre>{message.id}</pre>
        <div className="text-red-500">Error: {message.errorReason}</div>
      </div>
    );
  } else if (message.status === "completed") {
    return (
      <div className="flex flex-col items-start w-full max-w-[896px] mx-auto p-2">
        <div className="flex gap-2">
          <BranchControls message={message} />
          <button
            onClick={() => {
              client.ai.deleteMessage(message.chatId, message.id);
            }}
          >
            Delete
          </button>
        </div>
        <pre>{message.id}</pre>
        {message.content.map((part, index) => {
          if (part.type === "text") {
            return (
              <div key={index}>
                <Markdown content={part.text} />
              </div>
            );
          } else if (part.type === "reasoning") {
            return (
              <div key={index} className="text-slate-500">
                {part.text}
              </div>
            );
          } else if (part.type === "tool-call") {
            return (
              <div key={index} className="text-blue-500">
                {part.toolName} - {JSON.stringify(part.args)}
              </div>
            );
          }
        })}
      </div>
    );
  }
});

function BranchControls({ message }: { message: UiChatMessage }) {
  const context = useContext(BranchContext);
  if (context === null) {
    throw new Error("BranchControls must be a descendant of Messages");
  }
  const onBranchChange = context.onBranchChange;
  return (
    <>
      <button
        onClick={() => {
          if (message.prev !== null) {
            onBranchChange(message.prev);
          }
        }}
        className="disabled:opacity-50"
        disabled={!message.prev}
      >
        Previous
      </button>
      <button
        onClick={() => {
          if (message.next !== null) {
            onBranchChange(message.next);
          }
        }}
        className="disabled:opacity-50"
        disabled={!message.next}
      >
        Next
      </button>
    </>
  );
}
