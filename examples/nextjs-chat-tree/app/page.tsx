"use client";

import { AiChatMessage, AiUserMessage, MessageId } from "@liveblocks/core";
import { ChatComposer } from "@liveblocks/react-ui";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  useClient,
  useChatMessages,
  useCopilotChats,
} from "@liveblocks/react/suspense";
import Image from "next/image";
import { Fragment, useState } from "react";

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

function App() {
  const { chats } = useCopilotChats();
  if (chats.length === 0) throw new Error("No chats found");
  const chatId = chats[0].id;

  const client = useClient();
  const { messages } = useChatMessages(chatId);

  const tree = getMessageTree(messages);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex flex-col flex-1 overflow-y-auto gap-4">
        <MessageNodesRenderer messages={tree as MessageNode[]} />
      </div>

      {/* <div className="pb-4 mx-auto">
        <ChatComposer
          chatId={chatId}
          className="rounded-lg w-[896px] shadow-[0_0_1px_rgb(0_0_0/4%),0_2px_6px_rgb(0_0_0/4%),0_8px_26px_rgb(0_0_0/6%)]"
          onComposerSubmit={async (message) => {
            const result = await client.ai.addUserMessage(
              chatId,
              null,
              message.text
            );
            await client.ai.ask(chatId, result.message.id, { stream: true });
          }}
        />
      </div> */}
    </div>
  );
}

function MessageNodesRenderer({ messages }: { messages: MessageNode[] }) {
  const [selectedMessageId, setSelectedMessageId] = useState<
    MessageId | undefined
  >(
    messages.reduce((prev, curr) => {
      return prev.createdAt > curr.createdAt ? prev : curr;
    }, messages[0])?.id
  );

  const message = messages.find((message) => message.id === selectedMessageId);

  if (message === undefined) return null;

  function BranchButtons({ message }: { message: MessageNode }) {
    return (
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => {
            const index = messages.findIndex((m) => m.id === selectedMessageId);
            if (index > 0) {
              setSelectedMessageId(messages[index - 1].id);
            }
          }}
          className="disabled:opacity-50"
          disabled={messages.indexOf(message) === 0}
        >
          Previous
        </button>
        <button
          onClick={() => {
            const index = messages.findIndex((m) => m.id === selectedMessageId);
            if (index < messages.length - 1) {
              setSelectedMessageId(messages[index + 1].id);
            }
          }}
          className="disabled:opacity-50"
          disabled={messages.indexOf(message) === messages.length - 1}
        >
          Next
        </button>
      </div>
    );
  }

  if (message.role === "user") {
    const text = message.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n");

    return (
      <Fragment key={message.id}>
        <div className="flex flex-col items-end w-full max-w-[896px] mx-auto p-2">
          <BranchButtons message={message} />
          <div className="max-w-[80%]">{text}</div>
        </div>

        <MessageNodesRenderer messages={message.children} />
      </Fragment>
    );
  } else if (message.role === "assistant") {
    if (message.status === "pending") {
      return (
        <div className="flex flex-col items-start w-full max-w-[896px] mx-auto p-2">
          <BranchButtons message={message} />
          <div>Generating response...</div>
          <MessageNodesRenderer messages={message.children} />
        </div>
      );
    } else if (message.status === "failed") {
      return (
        <div className="flex flex-col items-start w-full max-w-[896px] mx-auto p-2">
          <BranchButtons message={message} />
          <div className="text-red-500">Error: {message.errorReason}</div>
          <MessageNodesRenderer messages={message.children} />
        </div>
      );
    } else if (message.status === "completed") {
      return (
        <div className="flex flex-col items-start w-full max-w-[896px] mx-auto p-2">
          <BranchButtons message={message} />
          {message.content.map((part, index) => {
            if (part.type === "text") {
              return <div key={index}>{part.text}</div>;
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

          <MessageNodesRenderer messages={message.children} />
        </div>
      );
    }
  }
}

function UserChatMessage({ message }: { message: MessageNode }) {}

type MessageNode = AiChatMessage & {
  children: MessageNode[];
};

type RootMessageNode = Omit<MessageNode, "parentId"> & {
  parentId: null;
};

function getMessageTree(messages: readonly AiChatMessage[]): RootMessageNode[] {
  const messagesById = new Map<MessageId, MessageNode>();
  for (const message of messages) {
    messagesById.set(message.id, { ...message, children: [] });
  }

  const roots: RootMessageNode[] = [];
  for (const message of messages) {
    const node = messagesById.get(message.id);
    if (node === undefined) continue;

    if (node.parentId === null) {
      roots.push({ ...node, parentId: null });
    } else {
      const parent = messagesById.get(node.parentId);
      if (parent === undefined) continue;
      parent.children.push(node);
    }
  }

  return roots;
}
