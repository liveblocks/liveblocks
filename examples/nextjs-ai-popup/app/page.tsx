"use client";

import {
  ClientSideSuspense,
  useAiChats,
  useDeleteAiChat,
} from "@liveblocks/react";
import { AiChat } from "@liveblocks/react-ui";
import * as PopoverPrimitives from "@radix-ui/react-popover";
import { nanoid } from "nanoid";
import Link from "next/link";
import { CSSProperties, useCallback, useState } from "react";
import { useAiChat } from "@liveblocks/react/suspense";

export default function Page() {
  return (
    <ClientSideSuspense fallback={null}>
      <ChatPopup />
    </ClientSideSuspense>
  );
}

function ChatPopup() {
  // TODO fetch the latest chatId after the suspense bug is resolved
  const [chatId, setChatId] = useState(getDefaultChatId);
  const [showListing, setShowListing] = useState(false);

  const goToChat = useCallback((id: string) => {
    setChatId(id);
    setShowListing(false);
  }, []);

  return (
    <div className="ai-widget-container">
      <PopoverPrimitives.Root defaultOpen={true}>
        <PopoverPrimitives.Trigger asChild>
          <button
            className={
              "flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-black shadow-lg transition-all fixed bottom-8 right-8 z-40 duration-200"
            }
            aria-label="Open AI Assistant"
          >
            ✨
          </button>
        </PopoverPrimitives.Trigger>
        <PopoverPrimitives.Portal>
          <PopoverPrimitives.Content
            sideOffset={16}
            side="top"
            align="end"
            onInteractOutside={(e) => {
              // Don't close when clicking outside
              e.preventDefault();
            }}
            className="fixed bottom-0 right-0 z-50 h-[700px] max-h-[75vh] w-[420px] max-w-[90vw] overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl will-change-[transform,opacity]"
          >
            <div className="relative flex h-full w-full flex-col gap-1">
              <div className="flex h-11 shrink-0 items-center justify-between pl-3 pr-3 pt-3">
                <button
                  onClick={() => setShowListing(!showListing)}
                  className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm font-medium hover:bg-gray-100"
                >
                  {showListing ? (
                    <>← Back</>
                  ) : (
                    // <ClientSideSuspense fallback={null}>
                    <Title chatId={chatId} />
                    // </ClientSideSuspense>
                  )}
                </button>

                <span className="flex items-center gap-0.5">
                  <button
                    onClick={() => goToChat(nanoid())}
                    className="flex h-8 items-center gap-1 rounded-lg px-2 text-sm font-medium hover:bg-gray-100"
                  >
                    new chat
                  </button>
                  <PopoverPrimitives.Close className="hover:bg-gray-100 hover:dark:bg-gray-800 flex size-8 items-center justify-center rounded-full hover:bg-product-surface-raised">
                    <span className="sr-only">Close</span>
                    close
                  </PopoverPrimitives.Close>
                </span>
              </div>
              <div className="relative flex-grow">
                {showListing ? (
                  <ChatListing onSelectChat={goToChat} />
                ) : (
                  <Chat chatId={chatId} />
                )}
              </div>
            </div>
          </PopoverPrimitives.Content>
        </PopoverPrimitives.Portal>
      </PopoverPrimitives.Root>
    </div>
  );
}

function Chat({ chatId }: { chatId: string }) {
  return (
    <div className="absolute inset-0 flex flex-col">
      <AiChat
        layout="compact"
        chatId={chatId}
        components={{
          // TODO make a pretty empty state
          // pretend we have a function that lets you add a message
          // to the chat e.g. sendAiMessage
          Empty: () => <div className="p-4">Empty state</div>,

          // TODO default spinner is probably fine?
          // Loading: () => <div>loading... </div>,

          Anchor: (props) => (
            <Link href={props.href || ""}>{props.children}</Link>
          ),
        }}
        className="min-h-0 flex-shrink flex-grow overflow-x-hidden overflow-y-scroll"
        style={
          {
            "--lb-background": "#fff",
            "--lb-elevation-shadow-small": "0 0 0 1px rgba(0, 0, 0, 0.1)",
          } as CSSProperties
        }
      />
    </div>
  );
}

function ChatListing({
  onSelectChat,
}: {
  onSelectChat: (chatId: string) => void;
}) {
  const { chats, error, isLoading } = useAiChats();
  const deleteAiChat = useDeleteAiChat();

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        loading...{" "}
      </div>
    );
  }

  if (error) {
    return <div>error: {error.message}</div>;
  }

  return (
    <div className="absolute inset-0 flex flex-col gap-2 overflow-auto p-5">
      <div className="text-sm font-medium text-gray-600">Chat history</div>
      <ul className="flex flex-col gap-3 text-sm pl-0">
        {chats.map((chat) => (
          <li key={chat.id} className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              {/* TODO hover, full width, chat icon at left, etc */}
              <button
                onClick={() => onSelectChat(chat.id)}
                className="text-left font-medium"
              >
                {chat.title || "Untitled"}
              </button>
              <div className="text-xs text-gray-400">
                {new Date(chat.lastMessageAt || chat.createdAt).toLocaleString(
                  "en-US",
                  {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  }
                )}
              </div>
            </div>
            <button onClick={() => deleteAiChat(chat.id)}>delete</button>
          </li>
        ))}
      </ul>

      {/* TODO not sure if we need this */}
      <button onClick={() => onSelectChat(nanoid())} className="mt-2 shrink-0">
        new chat
      </button>
    </div>
  );
}

function Title({ chatId }: { chatId: string }) {
  const { chat, error, isLoading } = useAiChat(chatId);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // TODO this will work after a bug fix
  return <>{chat?.title || "Untitled"}</>;
}

// Creating a new chat every hour
function getDefaultChatId() {
  return new Date().toISOString().slice(0, 13);
}
