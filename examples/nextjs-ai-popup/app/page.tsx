"use client";

import {
  ClientSideSuspense,
  useAiChats,
  useDeleteAiChat,
  useSendAiMessage,
} from "@liveblocks/react";
import { AiChat } from "@liveblocks/react-ui";
import * as PopoverPrimitives from "@radix-ui/react-popover";
import { nanoid } from "nanoid";
import Link from "next/link";
import { ComponentProps, useCallback, useState } from "react";
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
              "flex size-14 items-center border border-neutral-200 justify-center rounded-full bg-white hover:bg-neutral-50 shadow-[0px_36px_49px_0px_rgba(0,0,0,0.01),0px_15.04px_20.471px_0px_rgba(0,0,0,0.01),0px_8.041px_10.945px_0px_rgba(0,0,0,0.01),0px_4.508px_6.136px_0px_rgba(0,0,0,0.00),0px_2.394px_3.259px_0px_rgba(0,0,0,0.00),0px_0.996px_1.356px_0px_rgba(0,0,0,0.00)] transition-all fixed bottom-8 right-8 z-40 duration-200"
            }
            aria-label="Open AI Assistant"
          >
            <SparklesIcon className="fill-blue-500 size-7" />
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
            className="fixed bottom-0 right-0 z-50 h-[700px] max-h-[75vh] w-[420px] max-w-[90vw] overflow-hidden rounded-xl ring-1 ring-neutral-200 bg-neutral-50 shadow-[0px_36px_49px_0px_rgba(0,0,0,0.01),0px_15.04px_20.471px_0px_rgba(0,0,0,0.01),0px_8.041px_10.945px_0px_rgba(0,0,0,0.01),0px_4.508px_6.136px_0px_rgba(0,0,0,0.00),0px_2.394px_3.259px_0px_rgba(0,0,0,0.00),0px_0.996px_1.356px_0px_rgba(0,0,0,0.00)] will-change-[transform,opacity]"
          >
            <div className="relative flex h-full w-full flex-col gap-1">
              <div className="flex h-11 shrink-0 items-center justify-between px-4 pt-4">
                <button
                  onClick={() => setShowListing(!showListing)}
                  className="flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium hover:bg-neutral-100"
                >
                  <ChevronLeftIcon className="size-4 opacity-70 -ml-1" />
                  {showListing ? (
                    <span>Back</span>
                  ) : (
                    // <ClientSideSuspense fallback={null}>
                    <Title chatId={chatId} />
                    // </ClientSideSuspense>
                  )}
                </button>

                <span className="flex items-center gap-1.5">
                  <button
                    onClick={() => goToChat(nanoid())}
                    className="flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium hover:bg-neutral-100"
                  >
                    <PlusIcon className="size-4 -ml-1 opacity-70" />
                    <span>New chat</span>
                  </button>
                  <PopoverPrimitives.Close className="bg-neutral-50 hover:bg-neutral-100 flex size-8 items-center justify-center rounded-full">
                    <span className="sr-only">Close</span>
                    <CloseIcon className="size-4 opacity-70" />
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
          Empty: ({ chatId }) => {
            const sendMessage = useSendAiMessage(chatId);

            return (
              <div className="p-[var(--spacing)] h-full flex flex-col gap-5 justify-end">
                <h3>How can I help you?</h3>
                <div className="flex flex-wrap items-start gap-2">
                  <button
                    className="px-3.5 py-1.5 transition-colors rounded-full flex items-center gap-2 bg-white border-neutral-200 border text-sm font-medium shadow-xs hover:bg-neutral-50"
                    onClick={() => sendMessage("Check the weather in Paris")}
                  >
                    Check weather
                  </button>
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

          // TODO default spinner is probably fine?
          // Loading: () => <div>loading... </div>,

          Anchor: (props) => (
            <Link href={props.href || ""}>{props.children}</Link>
          ),
        }}
        className="min-h-0 flex-shrink flex-grow overflow-x-hidden overflow-y-scroll"
      />
    </div>
  );
}

function ChatListing({
  onSelectChat,
}: {
  onSelectChat: (chatId: string) => void;
}) {
  const deleteAiChat = useDeleteAiChat();
  const { chats, error, isLoading, hasFetchedAll, fetchMore, isFetchingMore } =
    useAiChats();

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
    <div className="absolute inset-0 flex flex-col gap-2 overflow-auto p-[var(--spacing)]">
      <ul className="flex flex-col gap-2 text-sm pl-0">
        {chats.map((chat) => (
          <li
            key={chat.id}
            className="group relative flex items-center justify-between p-[var(--spacing)] bg-white border border-neutral-200 rounded-md hover:bg-neutral-50"
          >
            <div className="flex flex-col gap-0.5">
              {/* TODO hover, full width, chat icon at left, etc */}
              <button
                onClick={() => onSelectChat(chat.id)}
                className="text-left font-medium before:absolute before:inset-0"
              >
                {chat.title || "Untitled"}
              </button>
              <div className="text-xs text-neutral-400">
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
            <button
              onClick={() => deleteAiChat(chat.id)}
              className="relative hidden group-hover:block"
              title="Delete chat"
            >
              <TrashIcon className="text-red-600 size-4" />
            </button>
          </li>
        ))}
        {hasFetchedAll ? null : (
          <button
            disabled={isFetchingMore}
            onClick={fetchMore}
            className="text-sm py-2 bg-white border border-neutral-200 rounded-md font-medium hover:bg-neutral-50"
          >
            Load more
          </button>
        )}
      </ul>
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

function CloseIcon(props: ComponentProps<"svg">) {
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
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function SparklesIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      {...props}
    >
      <path d="M17.617 14.034c-4.172 1.378-5.561 2.768-6.94 6.94a.375.375 0 0 1-.711 0c-1.379-4.172-2.768-5.561-6.94-6.94a.375.375 0 0 1 0-.712c4.172-1.378 5.561-2.767 6.94-6.939a.375.375 0 0 1 .711 0c1.379 4.172 2.768 5.561 6.94 6.94a.375.375 0 0 1 0 .711ZM21.102 6.723c-2.085.689-2.78 1.384-3.47 3.47a.187.187 0 0 1-.356 0c-.688-2.085-1.383-2.78-3.47-3.47-.17-.056-.17-.298 0-.355 2.086-.689 2.781-1.384 3.47-3.47.057-.172.3-.172.356 0 .689 2.085 1.384 2.78 3.47 3.47.171.056.171.298 0 .355Z" />
    </svg>
  );
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

function ChevronLeftIcon(props: ComponentProps<"svg">) {
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
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function TrashIcon(props: ComponentProps<"svg">) {
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
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}
