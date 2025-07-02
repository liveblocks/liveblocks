"use client";

import { ClientSideSuspense, useSendAiMessage } from "@liveblocks/react";
import { AiChat } from "@liveblocks/react-ui";
import { nanoid } from "nanoid";
import Link from "next/link";
import { ComponentProps, useCallback, useState } from "react";

export default function Page() {
  const [chatId, setChatId] = useState(getDefaultChatId);

  const createNewChat = useCallback(() => {
    setChatId(nanoid());
  }, []);

  return (
    <main className="max-w-screen-md w-full min-h-full mx-auto border border-neutral-200 flex-grow">
      <div className="p-10 flex flex-col gap-0.5 border-b pb-11 border-neutral-200">
        <h1 className="text-3xl font-semibold">Chat with support</h1>
        <div className="text-neutral-500">
          Describe your problem to get help or create a support ticket.
        </div>
      </div>
      <div className="px-10 py-10 bg-white">
        <ClientSideSuspense fallback={null}>
          <Chat chatId={chatId} />
        </ClientSideSuspense>
      </div>
      <div className="px-10 py-4 flex gap-0.5 border-t border-neutral-200 justify-end items-center">
        <button
          className="px-3.5 py-1.5 transition-colors rounded flex items-center gap-2 bg-white border-neutral-200 border text-sm font-medium shadow-xs hover:bg-neutral-100"
          onClick={createNewChat}
        >
          Start again
        </button>
      </div>
    </main>
  );
}

function Chat({ chatId }: { chatId: string }) {
  return (
    <AiChat
      className="min-h-0 h-full flex-shrink flex-grow overflow-x-hidden"
      chatId={chatId}
      copilotId={process.env.NEXT_PUBLIC_LIVEBLOCKS_COPILOT_ID || undefined}
      // layout="compact"
      components={{
        Empty: ({ chatId }) => {
          const sendMessage = useSendAiMessage(chatId);

          return (
            <div className="pb-8 h-full flex flex-col gap-5 justify-end">
              <h3>How can I help you?</h3>
              <div className="flex flex-wrap items-start gap-2">
                <button
                  className="px-3.5 py-1.5 transition-colors rounded-full flex items-center gap-2 bg-white border-neutral-200 border text-sm font-medium shadow-xs hover:bg-neutral-50"
                  onClick={() =>
                    sendMessage("Write a story about a brave knight")
                  }
                >
                  Write a story
                </button>
                <button
                  className="px-3.5 py-1.5 transition-colors rounded-full flex items-center gap-2 bg-white border-neutral-200 border text-sm font-medium shadow-xs hover:bg-neutral-50"
                  onClick={() => sendMessage("Teach me React")}
                >
                  Teach me React
                </button>
                <button
                  className="px-3.5 py-1.5 transition-colors rounded-full flex items-center gap-2 bg-white border-neutral-200 border text-sm font-medium shadow-xs hover:bg-neutral-50"
                  onClick={() => sendMessage("Explain quantum computing")}
                >
                  Explain quantum computing
                </button>
                <button
                  className="px-3.5 py-1.5 transition-colors rounded-full flex items-center gap-2 bg-white border-neutral-200 border text-sm font-medium shadow-xs hover:bg-neutral-50"
                  onClick={() => sendMessage("Plan weekly meals")}
                >
                  Plan weekly meals
                </button>
              </div>
            </div>
          );
        },

        Anchor: (props) => (
          <Link href={props.href || ""}>{props.children}</Link>
        ),
      }}
    />
  );
}

// Creating a new chat every hour
function getDefaultChatId() {
  return new Date().toISOString().slice(0, 13);
}

function PlusIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
