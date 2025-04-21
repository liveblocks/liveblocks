"use client";

import {
  AiAssistantMessage,
  AiChatMessage,
  AiUserMessage,
  MessageId,
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
import {
  createContext,
  useCallback,
  useContext,
  useState,
  useSyncExternalStore,
} from "react";
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

  const client = useClient();

  const [branch, setBranch] = useState<MessageId | undefined>(undefined);
  const { messages } = useChatMessages(chatId, branch);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex flex-col flex-1 overflow-y-auto gap-4">
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
          className="rounded-lg mx-auto w-full max-w-[896px] shadow-[0_0_1px_rgb(0_0_0/4%),0_2px_6px_rgb(0_0_0/4%),0_8px_26px_rgb(0_0_0/6%)]"
          onComposerSubmit={async (message) => {
            const lastMessageId = messages.length > 0 ? messages[0].id : null;
            const result = await client.ai.addUserMessage(
              chatId,
              lastMessageId,
              message.text
            );
            await client.ai.ask(chatId, result.message.id, { stream: true });
          }}
        />
      </div>
    </div>
  );
}

function UserMessage({ message }: { message: AiUserMessage }) {
  const text = message.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");

  return (
    <div
      className="flex flex-col items-end w-full max-w-[896px] mx-auto p-2"
      key={message.id}
    >
      <div className="flex gap-2">
        <BranchControls message={message} />
      </div>
      <div className="max-w-[80%]">{text}</div>
    </div>
  );
}

function AssistantMessage({ message }: { message: AiAssistantMessage }) {
  if (message.status === "pending") {
    return (
      <div className="flex flex-col items-start w-full max-w-[896px] mx-auto p-2">
        <div className="flex gap-2">
          <BranchControls message={message} />
        </div>
        <div>Generating response...</div>
      </div>
    );
  } else if (message.status === "failed") {
    return (
      <div className="flex flex-col items-start w-full max-w-[896px] mx-auto p-2">
        <div className="flex gap-2">
          <BranchControls message={message} />
        </div>
        <div className="text-red-500">Error: {message.errorReason}</div>
      </div>
    );
  } else if (message.status === "completed") {
    return (
      <div className="flex flex-col items-start w-full max-w-[896px] mx-auto p-2">
        <div className="flex gap-2">
          <BranchControls message={message} />
        </div>
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
}

function BranchControls({ message }: { message: AiChatMessage }) {
  const context = useContext(BranchContext);
  if (context === null) {
    throw new Error("BranchControls must be a descendant of Messages");
  }
  const onBranchChange = context.onBranchChange;

  const client = useClient();

  const getNumOfYoungerSiblings = useCallback((): number => {
    const siblings = client.ai
      .getMessagesPool(message.chatId)
      .getSiblings(message.id);
    return siblings.filter((sibling) => sibling.createdAt > message.createdAt)
      .length;
  }, [client, message.id, message.chatId, message.createdAt]);

  const getNumOfOlderSiblings = useCallback(() => {
    const siblings = client.ai
      .getMessagesPool(message.chatId)
      .getSiblings(message.id);
    return siblings.filter((sibling) => sibling.createdAt < message.createdAt)
      .length;
  }, [client, message.id, message.chatId, message.createdAt]);

  const numOfYoungerSiblings = useSyncExternalStore(
    (callback) => {
      const signal = client.ai.signals.getMessagesForChatΣ(message.chatId);
      const unsubscribe = signal.subscribe(callback);
      return () => {
        signal[Symbol.dispose]();
        unsubscribe();
      };
    },
    getNumOfYoungerSiblings,
    getNumOfYoungerSiblings
  );

  const numOfOlderSiblings = useSyncExternalStore(
    (callback) => {
      const signal = client.ai.signals.getMessagesForChatΣ(message.chatId);
      const unsubscribe = signal.subscribe(callback);
      return () => {
        signal[Symbol.dispose]();
        unsubscribe();
      };
    },
    getNumOfOlderSiblings,
    getNumOfOlderSiblings
  );

  return (
    <>
      <button
        onClick={() => {
          if (numOfOlderSiblings === 0) return;
          const siblings = client.ai
            .getMessagesPool(message.chatId)
            .getSiblings(message.id);

          let previousMessage: AiChatMessage | null = null;
          for (const sibling of siblings) {
            if (sibling.createdAt < message.createdAt) {
              if (previousMessage === null) {
                previousMessage = sibling;
              } else if (sibling.createdAt < previousMessage.createdAt) {
                previousMessage = sibling;
              }
            }
          }
          if (previousMessage !== null) {
            onBranchChange(previousMessage.id);
          }
        }}
        className="disabled:opacity-50"
        disabled={numOfOlderSiblings === 0}
      >
        Previous
      </button>
      <button
        onClick={() => {
          if (numOfYoungerSiblings === 0) return;
          const siblings = client.ai
            .getMessagesPool(message.chatId)
            .getSiblings(message.id);

          let nextMessage: AiChatMessage | null = null;
          for (const sibling of siblings) {
            if (sibling.createdAt > message.createdAt) {
              if (nextMessage === null) {
                nextMessage = sibling;
              } else if (sibling.createdAt > nextMessage.createdAt) {
                nextMessage = sibling;
              }
            }
          }
          console.log(nextMessage);
          if (nextMessage !== null) {
            onBranchChange(nextMessage.id);
          }
        }}
        className="disabled:opacity-50"
        disabled={numOfYoungerSiblings === 0}
      >
        Next
      </button>
    </>
  );
}
