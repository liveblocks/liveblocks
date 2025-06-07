"use client";

import {
  ClientSideSuspense,
  RegisterAiKnowledge,
  useDeleteAiChat,
} from "@liveblocks/react";
import { AiChat } from "@liveblocks/react-ui";
import * as PopoverPrimitives from "@radix-ui/react-popover";
import { nanoid } from "nanoid";
import Link from "next/link";
import { ComponentProps, useCallback, useState } from "react";
import { useAiChat } from "@liveblocks/react/suspense";
import { ChatListing } from "./AiChatListing";
import { AiChatPlaceholder } from "./AiChatPlaceholder";
import {
  NavigateToPageTool,
  TransactionToolAi,
  MemberToolAi,
  SendInvoiceRemindersTool,
} from "./AiChatTools";
import { RiRobot2Line } from "@remixicon/react";
import { siteConfig } from "@/app/siteConfig";
import useSWR from "swr";

export function AiPopup() {
  return (
    <ClientSideSuspense
      fallback={
        <div className="flex size-14 items-center border border-gray-200 justify-center rounded-full bg-gray-300 shadow-[0px_36px_49px_0px_rgba(0,0,0,0.01),0px_15.04px_20.471px_0px_rgba(0,0,0,0.01),0px_8.041px_10.945px_0px_rgba(0,0,0,0.01),0px_4.508px_6.136px_0px_rgba(0,0,0,0.00),0px_2.394px_3.259px_0px_rgba(0,0,0,0.00),0px_0.996px_1.356px_0px_rgba(0,0,0,0.00)] transition-all fixed bottom-8 right-8 z-40 duration-200">
          {/* <SparklesIcon className="fill-gray-400 size-7" /> */}
          <RiRobot2Line className="size-7 text-white" />
        </div>
      }
    >
      <ChatPopup />
    </ClientSideSuspense>
  );
}

function Chat({ chatId }: { chatId: string }) {
  // TODO
  // const { data: contexts } = useSWR(
  //   "/api/liveblocks-ai-context",
  //   (resource: string, init: RequestInit) =>
  //     fetch(resource, init).then((res) => res.json())
  // );
  // copilotId="co_wFdUQ9c0kxhQ0BAlkct0B"

  const { data: plan } = useSWR("/api/plan");

  return (
    <div className="absolute inset-0 flex flex-col">
      <RegisterAiKnowledge
        description="Pages you can navigate to"
        value={siteConfig.baseLinks}
      />
      <RegisterAiKnowledge
        description="How to use tools"
        value="Don't tell the user the names of any tools. Just say you're doing the action."
      />
      <RegisterAiKnowledge
        description="The user's plan information"
        value={plan}
      />
      <NavigateToPageTool />
      <TransactionToolAi />
      <SendInvoiceRemindersTool />
      <MemberToolAi />
      <AiChat
        layout="compact"
        chatId={chatId}
        className="min-h-0 flex-shrink flex-grow overflow-x-hidden overflow-y-scroll"
        components={{
          Empty: AiChatPlaceholder,
          Anchor: (props) => (
            <Link href={props.href || ""}>{props.children}</Link>
          ),
        }}
      />
    </div>
  );
}

// Creating a new chat every hour
function getDefaultChatId() {
  return new Date().toISOString().slice(0, 13);
}

function ChatPopup() {
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
            className={
              "flex size-14 items-center border border-gray-200 justify-center rounded-full bg-blue-600 hover:bg-blue-500 shadow-[0px_36px_49px_0px_rgba(0,0,0,0.01),0px_15.04px_20.471px_0px_rgba(0,0,0,0.01),0px_8.041px_10.945px_0px_rgba(0,0,0,0.01),0px_4.508px_6.136px_0px_rgba(0,0,0,0.00),0px_2.394px_3.259px_0px_rgba(0,0,0,0.00),0px_0.996px_1.356px_0px_rgba(0,0,0,0.00)] transition-all fixed bottom-8 right-8 z-40 duration-200"
            }
            aria-label="Open AI Assistant"
          >
            {/* <SparklesIcon className="fill-blue-600 size-7" /> */}
            <RiRobot2Line className="size-7 text-white" />
          </button>
        </PopoverPrimitives.Trigger>
        <PopoverPrimitives.Portal>
          <PopoverPrimitives.Content
            sideOffset={16}
            side="top"
            align="end"
            onInteractOutside={(e) => e.preventDefault()} // Don't close when clicking outside
            className="fixed bottom-0 right-0 z-50 h-[700px] max-h-[75vh] w-[420px] max-w-[90vw] overflow-hidden rounded-xl ring-1 ring-gray-200 dark:ring-gray-700 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 shadow-[0px_36px_49px_0px_rgba(0,0,0,0.01),0px_15.04px_20.471px_0px_rgba(0,0,0,0.01),0px_8.041px_10.945px_0px_rgba(0,0,0,0.01),0px_4.508px_6.136px_0px_rgba(0,0,0,0.00),0px_2.394px_3.259px_0px_rgba(0,0,0,0.00),0px_0.996px_1.356px_0px_rgba(0,0,0,0.00)] will-change-[transform,opacity]"
          >
            <div className="relative flex h-full w-full flex-col gap-1">
              <div className="flex h-11 shrink-0 items-center justify-between px-4 pt-4">
                <button
                  onClick={() => {
                    // If the current chat is deleted, don't go back to it, create a new one
                    if (chat?.deletedAt) {
                      setChatId(nanoid());
                    }
                    setShowListing(!showListing);
                  }}
                  className="flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 truncate"
                >
                  <ChevronLeftIcon className="size-4 opacity-70 -ml-1 shrink-0" />
                  {showListing ? (
                    <span>Back</span>
                  ) : (
                    <div className="truncate grow shrink">
                      {isLoading ? null : chat?.title || "Untitled"}
                    </div>
                  )}
                </button>

                <span className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => goToChat(nanoid())}
                    className="flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <PlusIcon className="size-4 -ml-1 opacity-70" />
                    <span>New chat</span>
                  </button>
                  <PopoverPrimitives.Close className="bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 flex size-8 items-center justify-center rounded-full">
                    <span className="sr-only">Close</span>
                    <CloseIcon className="size-4 opacity-70" />
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
