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
import { useCallback, useState } from "react";
import { useAiChat } from "@liveblocks/react/suspense";
import { ChatListing } from "./AiChatListing";
import { AiChatPlaceholder } from "./AiChatPlaceholder";
import {
  NavigateToPageTool,
  TransactionToolAi,
  MemberToolAi,
  SendInvoiceRemindersTool,
  InviteMemberTool,
  QueryTransactionTool,
  QueryInvoiceTool,
} from "./AiChatTools";
import { RiRobot2Line } from "@remixicon/react";
import { siteConfig } from "@/app/siteConfig";
import useSWR from "swr";
import { ArrowLeftIcon, PlusIcon, XIcon } from "lucide-react";

export function AiPopup() {
  return (
    <ClientSideSuspense
      fallback={
        <div className="flex size-14 items-center border border-gray-200 justify-center rounded-full bg-gray-300 shadow-[0px_36px_49px_0px_rgba(0,0,0,0.01),0px_15.04px_20.471px_0px_rgba(0,0,0,0.01),0px_8.041px_10.945px_0px_rgba(0,0,0,0.01),0px_4.508px_6.136px_0px_rgba(0,0,0,0.00),0px_2.394px_3.259px_0px_rgba(0,0,0,0.00),0px_0.996px_1.356px_0px_rgba(0,0,0,0.00)] transition-all fixed bottom-8 right-8 z-40 duration-200">
          <RiRobot2Line className="size-7 text-white" />
        </div>
      }
    >
      <ChatPopup />
    </ClientSideSuspense>
  );
}

function Chat({ chatId }: { chatId: string }) {
  // Knowledge about the current team, roles, departments
  const { data: team } = useSWR("/api/team");

  // Knowledge about the current user's plan
  const { data: plan } = useSWR("/api/plan");

  return (
    <div className="absolute inset-0 flex flex-col">
      <RegisterAiKnowledge
        description="The current date and time for the user's timezone"
        value={new Date().toString()}
      />
      <RegisterAiKnowledge
        description="The page the user is currently on"
        value={window.location.pathname}
      />
      <RegisterAiKnowledge
        // TODO figure out why AI won't write markdown links
        description="Pages you can navigate to. Use markdown to add hyperlinks to your answers, and always link when appropriate. For example: `[Billing page](/settings/billing)`."
        value={siteConfig.baseLinks}
      />
      <RegisterAiKnowledge
        description="How to use tools"
        value="Don't tell the user the names of any tools. Just say you're doing the action."
      />
      <RegisterAiKnowledge
        description="The user's plan information. There's more information in the billing page, add a link to it with markdown."
        value={plan}
      />
      <RegisterAiKnowledge
        description="The team's information. There's more information in the users page, add a link to it with markdown."
        value={team}
      />
      <QueryTransactionTool />
      <QueryInvoiceTool />
      <NavigateToPageTool />
      <TransactionToolAi />
      <SendInvoiceRemindersTool />
      <MemberToolAi />
      <InviteMemberTool onInvite={() => {}} />
      <AiChat
        layout="compact"
        chatId={chatId}
        copilotId={process.env.NEXT_PUBLIC_LIVEBLOCKS_COPILOT_ID || undefined}
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
              "flex size-14 items-center border border-gray-200 dark:border-gray-800 justify-center rounded-full bg-blue-600 hover:bg-blue-500 shadow-[0px_36px_49px_0px_rgba(0,0,0,0.01),0px_15.04px_20.471px_0px_rgba(0,0,0,0.01),0px_8.041px_10.945px_0px_rgba(0,0,0,0.01),0px_4.508px_6.136px_0px_rgba(0,0,0,0.00),0px_2.394px_3.259px_0px_rgba(0,0,0,0.00),0px_0.996px_1.356px_0px_rgba(0,0,0,0.00)] transition-all fixed bottom-8 right-8 z-40 duration-200"
            }
            aria-label="Open AI Assistant"
          >
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
                  <ArrowLeftIcon className="size-4 opacity-70 -ml-1 shrink-0" />
                  {showListing ? (
                    <span>Back</span>
                  ) : (
                    <div className="truncate grow shrink">
                      {isLoading ? null : chat?.title || "Untitled chat"}
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
                    <XIcon className="size-4 opacity-70" />
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
