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
  SeatsTool,
  NavigateToPageTool,
  TransactionToolAi,
  MemberToolAi,
  SendInvoiceRemindersTool,
  InviteMemberTool,
  QueryTransactionTool,
  QueryInvoiceTool,
  SendOneUnpaidReminderTool,
} from "./AiChatTools";
import { siteConfig } from "@/app/siteConfig";
import useSWR from "swr";
import { ArrowLeftIcon, PlusIcon, XIcon } from "lucide-react";
import { useInvitedUsers } from "@/lib/useInvitedUsers";

export function AiPopup() {
  return (
    <ClientSideSuspense
      fallback={
        <div className="fixed right-6 bottom-6 z-40 flex size-12 items-center justify-center rounded-full border bg-white [filter:drop-shadow(0px_2.767px_2.214px_rgba(0,0,0,0.01))_drop-shadow(0px_6.65px_5.32px_rgba(0,0,0,0.01))_drop-shadow(0px_12.522px_10.017px_rgba(0,0,0,0.01))_drop-shadow(0px_22.336px_17.869px_rgba(0,0,0,0.02))_drop-shadow(0px_41.778px_33.422px_rgba(0,0,0,0.02))_drop-shadow(0px_100px_80px_rgba(0,0,0,0.03))] transition-all duration-200 dark:border-neutral-900 dark:bg-neutral-950">
          <CopilotIcon className="size-5 text-pink-500" />
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

  const { inviteUser } = useInvitedUsers();

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
      <SeatsTool />
      <QueryTransactionTool />
      <QueryInvoiceTool />
      <NavigateToPageTool />
      <TransactionToolAi />
      <SendInvoiceRemindersTool />
      <SendOneUnpaidReminderTool />
      <MemberToolAi />
      <InviteMemberTool onInvite={inviteUser} />
      <AiChat
        layout="compact"
        chatId={chatId}
        copilotId={process.env.NEXT_PUBLIC_LIVEBLOCKS_COPILOT_ID || undefined}
        className="min-h-0 shrink grow overflow-x-hidden overflow-y-scroll"
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
            className="fixed right-6 bottom-6 z-40 flex size-12 items-center justify-center rounded-full border bg-white [filter:drop-shadow(0px_2.767px_2.214px_rgba(0,0,0,0.01))_drop-shadow(0px_6.65px_5.32px_rgba(0,0,0,0.01))_drop-shadow(0px_12.522px_10.017px_rgba(0,0,0,0.01))_drop-shadow(0px_22.336px_17.869px_rgba(0,0,0,0.02))_drop-shadow(0px_41.778px_33.422px_rgba(0,0,0,0.02))_drop-shadow(0px_100px_80px_rgba(0,0,0,0.03))] transition-all duration-200 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-900"
            aria-label="Open AI Assistant"
          >
            <CopilotIcon className="size-5 text-pink-500" />
          </button>
        </PopoverPrimitives.Trigger>
        <PopoverPrimitives.Portal>
          <PopoverPrimitives.Content
            sideOffset={16}
            side="top"
            align="end"
            onInteractOutside={(e) => e.preventDefault()} // Don't close when clicking outside
            className="fixed right-0 bottom-0 z-50 h-[700px] max-h-[75vh] w-[420px] max-w-[90vw] overflow-hidden rounded-xl bg-neutral-50 shadow-[0px_36px_49px_0px_rgba(0,0,0,0.01),0px_15.04px_20.471px_0px_rgba(0,0,0,0.01),0px_8.041px_10.945px_0px_rgba(0,0,0,0.01),0px_4.508px_6.136px_0px_rgba(0,0,0,0.00),0px_2.394px_3.259px_0px_rgba(0,0,0,0.00),0px_0.996px_1.356px_0px_rgba(0,0,0,0.00)] ring-1 ring-neutral-200 will-change-[transform,opacity] dark:border-neutral-800 dark:bg-neutral-950 dark:ring-neutral-800"
          >
            <div className="relative flex h-full w-full flex-col gap-1">
              <div className="flex h-11 shrink-0 items-center justify-between px-4 pt-4">
                {!showListing ? (
                  <button
                    onClick={() => {
                      // If the current chat is deleted, don't go back to it, create a new one
                      if (chat?.deletedAt) {
                        setChatId(nanoid());
                      }
                      setShowListing(!showListing);
                    }}
                    className="flex h-8 items-center gap-1.5 truncate rounded-md px-3 text-sm font-medium hover:bg-neutral-200/50 dark:hover:bg-neutral-800"
                  >
                    <ArrowLeftIcon className="-ml-1 size-4 shrink-0 opacity-70" />
                    {showListing ? (
                      <span>{isLoading ? null : chat?.title || "Back"}</span>
                    ) : (
                      <div className="shrink grow truncate">Chats</div>
                    )}
                  </button>
                ) : null}

                <span className="ml-auto flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => goToChat(nanoid())}
                    className="flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium hover:bg-neutral-200/50 dark:hover:bg-neutral-800"
                  >
                    <PlusIcon className="-ml-1 size-4 opacity-70" />
                    <span>New chat</span>
                  </button>
                  <PopoverPrimitives.Close className="flex size-8 items-center justify-center rounded-md hover:bg-neutral-200/50 dark:hover:bg-neutral-800">
                    <span className="sr-only">Close</span>
                    <XIcon className="size-4 opacity-70" />
                  </PopoverPrimitives.Close>
                </span>
              </div>
              <div className="relative grow">
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

const CopilotIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16.0841 12.203C11.5641 13.696 10.0601 15.201 8.56711 19.721C8.54009 19.8018 8.48838 19.872 8.41929 19.9217C8.3502 19.9714 8.26723 19.9982 8.18211 19.9982C8.09698 19.9982 8.01401 19.9714 7.94493 19.9217C7.87584 19.872 7.82413 19.8018 7.79711 19.721C6.30311 15.201 4.79711 13.696 0.279108 12.203C0.198026 12.1763 0.127456 12.1246 0.0774348 12.0554C0.0274136 11.9862 0.000488281 11.9029 0.000488281 11.8175C0.000488281 11.7322 0.0274136 11.6489 0.0774348 11.5797C0.127456 11.5105 0.198026 11.4588 0.279108 11.432C4.79911 9.93805 6.30311 8.43305 7.79611 3.91405C7.82313 3.83333 7.87484 3.76314 7.94393 3.71341C8.01301 3.66369 8.09598 3.63693 8.18111 3.63693C8.26623 3.63693 8.3492 3.66369 8.41829 3.71341C8.48738 3.76314 8.53909 3.83333 8.56611 3.91405C10.0601 8.43405 11.5661 9.93805 16.0841 11.432C16.1657 11.4583 16.2368 11.5098 16.2873 11.5791C16.3378 11.6483 16.365 11.7318 16.365 11.8175C16.365 11.9033 16.3378 11.9867 16.2873 12.056C16.2368 12.1253 16.1657 12.1768 16.0841 12.203ZM19.8601 4.28305C17.6011 5.03005 16.8481 5.78305 16.1011 8.04305C16.0411 8.22805 15.7781 8.22805 15.7161 8.04305C14.9701 5.78305 14.2161 5.03105 11.9561 4.28305C11.7711 4.22305 11.7711 3.96005 11.9561 3.89905C14.2161 3.15305 14.9691 2.39905 15.7161 0.139046C15.7296 0.0986863 15.7555 0.0635938 15.79 0.0387298C15.8246 0.0138659 15.866 0.000488281 15.9086 0.000488281C15.9512 0.000488281 15.9927 0.0138659 16.0272 0.0387298C16.0617 0.0635938 16.0876 0.0986863 16.1011 0.139046C16.8471 2.39905 17.6011 3.15205 19.8611 3.89905C20.0461 3.95905 20.0461 4.22205 19.8611 4.28405L19.8601 4.28305Z"
        fill="currentColor"
      />
    </svg>
  );
};
