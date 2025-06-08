"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useCallback } from "react";
import {
  ClientSideSuspense,
  useAiChats,
  useDeleteAiChat,
} from "@liveblocks/react";
import * as PopoverPrimitives from "@radix-ui/react-popover";
import { nanoid } from "nanoid";
import { useAiChat } from "@liveblocks/react/suspense";
import { ComponentProps } from "react";
import { SharedAiChat } from "../SharedAiChat";

export default function PreviewPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PreviewPageContent />
    </Suspense>
  );

  function PreviewPageContent() {
    const searchParams = useSearchParams();
    const [config, setConfig] = useState({
      urlType: "iframe" as "iframe" | "picture",
      url: "",
      theme: "light" as "light" | "dark",
      title: "How can I help you?",
      description: "",
      suggestions: [] as string[],
      copilotId: "",
      accentColor: "",
    });

    useEffect(() => {
      if (searchParams) {
        setConfig({
          urlType:
            (searchParams.get("urlType") as "iframe" | "picture") || "iframe",
          url: searchParams.get("url") || "",
          theme: (searchParams.get("theme") as "light" | "dark") || "light",
          title: searchParams.get("title") || "How can I help you?",
          description: searchParams.get("description") || "",
          suggestions: searchParams.get("suggestions")
            ? JSON.parse(searchParams.get("suggestions")!)
            : [],
          copilotId: searchParams.get("copilotId") || "",
          accentColor: searchParams.get("accentColor") || "",
        });
      }
    }, [searchParams]);

    useEffect(() => {
      if (config.theme === "dark") {
        document.body.classList.add("dark");
        document.body.classList.remove("light");
      } else {
        document.body.classList.add("light");
        document.body.classList.remove("dark");
      }
    }, [config.theme]);

    useEffect(() => {
      document.documentElement.style.setProperty(
        "--accent",
        config.accentColor || "#3b82f6"
      );
    }, [config.accentColor]);

    return (
      <div
        className={`relative h-screen overflow-hidden bg-neutral-100 dark:bg-neutral-900`}
      >
        <div className="absolute inset-0">
          {config.url && config.urlType === "iframe" ? (
            <iframe
              src={config.url}
              className="w-full h-full border-0 bg-white dark:bg-neutral-900"
              title="Preview Content"
            />
          ) : config.url && config.urlType === "picture" ? (
            <img
              src={config.url}
              alt="Preview Content"
              className="w-full h-full object-cover bg-white dark:bg-neutral-900"
            />
          ) : (
            <div className="w-full h-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
              <p className="text-neutral-500 dark:text-neutral-400">
                No content URL provided
              </p>
            </div>
          )}
        </div>

        <ClientSideSuspense
          fallback={
            <div className="flex size-14 items-center border border-neutral-200 dark:border-neutral-700 justify-center rounded-full bg-white dark:bg-neutral-800 shadow-lg transition-all fixed bottom-8 right-8 z-40 duration-200">
              <SparklesIcon className="fill-neutral-400 size-7" />
            </div>
          }
        >
          <ChatPopup config={config} />
        </ClientSideSuspense>
      </div>
    );
  }

  function ChatPopup({ config }: { config: any }) {
    const [chatId, setChatId] = useState(getDefaultChatId);
    const [showListing, setShowListing] = useState(false);
    const { chat, isLoading } = useAiChat(chatId);
    const deleteAiChat = useDeleteAiChat();

    const goToChat = useCallback((id: string) => {
      setChatId(id);
      setShowListing(false);
    }, []);

    const deleteChat = useCallback(
      (id: string) => {
        deleteAiChat(id);
      },
      [deleteAiChat]
    );

    return (
      <div className="ai-widget-container">
        <PopoverPrimitives.Root defaultOpen={true}>
          <PopoverPrimitives.Trigger asChild>
            <button
              className="flex size-14 items-center border border-neutral-200 dark:border-neutral-700 justify-center rounded-full bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 shadow-lg transition-all fixed bottom-8 right-8 z-40 duration-200"
              aria-label="Open AI Assistant"
            >
              <SparklesIcon className="fill-[--accent] size-7" />
            </button>
          </PopoverPrimitives.Trigger>
          <PopoverPrimitives.Portal>
            <PopoverPrimitives.Content
              sideOffset={16}
              side="top"
              align="end"
              onInteractOutside={(e) => e.preventDefault()}
              className="fixed bottom-0 right-0 z-50 h-[700px] max-h-[75vh] w-[420px] max-w-[90vw] overflow-hidden rounded-xl ring-1 ring-neutral-200 dark:ring-neutral-700 bg-neutral-50 dark:bg-neutral-900 shadow-lg will-change-[transform,opacity]"
            >
              <div className="relative flex h-full w-full flex-col gap-1">
                <div className="flex h-11 shrink-0 items-center justify-between px-4 pt-4">
                  <button
                    onClick={() => {
                      if (chat?.deletedAt) {
                        setChatId(nanoid());
                      }
                      setShowListing(!showListing);
                    }}
                    className="flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 grow shrink truncate text-neutral-900 dark:text-neutral-100"
                  >
                    <ChevronLeftIcon className="size-4 opacity-70 -ml-1 shrink-0 grow-0" />
                    {showListing ? (
                      <span>Back</span>
                    ) : (
                      <span className="truncate">
                        {isLoading ? null : chat?.title || "Untitled"}
                      </span>
                    )}
                  </button>

                  <span className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => goToChat(nanoid())}
                      className="flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                    >
                      <PlusIcon className="size-4 -ml-1 opacity-70" />
                      <span>New chat</span>
                    </button>
                    <PopoverPrimitives.Close className="bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex size-8 items-center justify-center rounded-full">
                      <span className="sr-only">Close</span>
                      <CloseIcon className="size-4 text-gray-700 dark:text-gray-200" />
                    </PopoverPrimitives.Close>
                  </span>
                </div>
                <div className="relative flex-grow">
                  {showListing ? (
                    <ChatListing
                      onSelectChat={goToChat}
                      onDeleteChat={deleteChat}
                    />
                  ) : (
                    <Chat chatId={chatId} config={config} />
                  )}
                </div>
              </div>
            </PopoverPrimitives.Content>
          </PopoverPrimitives.Portal>
        </PopoverPrimitives.Root>
      </div>
    );
  }

  function Chat({ chatId, config }: { chatId: string; config: any }) {
    return (
      <div className="absolute inset-0 flex flex-col">
        <SharedAiChat
          title={config.title}
          description={config.description}
          suggestions={config.suggestions}
          theme={config.theme}
          copilotId={config.copilotId}
          chatId={chatId}
          className="min-h-0 flex-shrink flex-grow overflow-x-hidden overflow-y-scroll"
        />
      </div>
    );
  }

  function ChatListing({
    onSelectChat,
    onDeleteChat,
  }: {
    onSelectChat: (chatId: string) => void;
    onDeleteChat: (chatId: string) => void;
  }) {
    const {
      chats,
      error,
      isLoading,
      hasFetchedAll,
      fetchMore,
      isFetchingMore,
    } = useAiChats();

    if (isLoading) {
      return (
        <div className="flex h-full w-full items-center justify-center text-neutral-900 dark:text-neutral-100">
          loading...{" "}
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-neutral-900 dark:text-neutral-100">
          error: {error.message}
        </div>
      );
    }

    return (
      <div className="absolute inset-0 flex flex-col gap-2 overflow-auto p-[var(--spacing)]">
        <ul className="flex flex-col gap-2 text-sm pl-0 mt-0">
          {chats.map((chat) => (
            <li
              key={chat.id}
              className="group relative flex items-center justify-between p-[var(--spacing)] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-700"
            >
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => onSelectChat(chat.id)}
                  className="text-left font-medium before:absolute before:inset-0 truncate text-neutral-900 dark:text-neutral-100"
                >
                  {chat.title || "Untitled"}
                </button>
                <div className="text-xs text-neutral-400 dark:text-neutral-500">
                  {new Date(
                    chat.lastMessageAt || chat.createdAt
                  ).toLocaleString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>
              <button
                onClick={() => onDeleteChat(chat.id)}
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
              className="text-sm py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
            >
              Load more
            </button>
          )}
        </ul>
      </div>
    );
  }

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

  function PlusIcon(props: React.ComponentProps<"svg">) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={24}
        height={24}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <path d="M5 12h14M12 5v14" />
      </svg>
    );
  }

  function ChevronLeftIcon(props: React.ComponentProps<"svg">) {
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

  function TrashIcon(props: React.ComponentProps<"svg">) {
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

  function SparklesIcon(props: React.ComponentProps<"svg">) {
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
}
