"use client"

import {
  ClientSideSuspense,
  RegisterAiKnowledge,
  useDeleteAiChat,
} from "@liveblocks/react"
import { AiChat } from "@liveblocks/react-ui"
import * as PopoverPrimitives from "@radix-ui/react-popover"
import { nanoid } from "nanoid"
import Link from "next/link"
import { useCallback, useState } from "react"
import { useAiChat } from "@liveblocks/react/suspense"
import { ChatListing } from "./AiChatListing"
import { AiChatPlaceholder } from "./AiChatPlaceholder"
import {
  SeatsTool,
  NavigateToPageTool,
  TransactionToolAi,
  MemberToolAi,
  SendInvoiceRemindersTool,
  InviteMemberTool,
  QueryTransactionTool,
  QueryInvoiceTool,
} from "./AiChatTools"
import { RiRobot2Line } from "@remixicon/react"
import { siteConfig } from "@/app/siteConfig"
import useSWR from "swr"
import { ArrowLeftIcon, PlusIcon, XIcon } from "lucide-react"

export function AiPopup() {
  return (
    <ClientSideSuspense
      fallback={
        <div className="fixed right-8 bottom-8 z-40 flex size-14 items-center justify-center rounded-full border bg-white shadow-[0px_36px_49px_0px_rgba(0,0,0,0.01),0px_15.04px_20.471px_0px_rgba(0,0,0,0.01),0px_8.041px_10.945px_0px_rgba(0,0,0,0.01),0px_4.508px_6.136px_0px_rgba(0,0,0,0.00),0px_2.394px_3.259px_0px_rgba(0,0,0,0.00),0px_0.996px_1.356px_0px_rgba(0,0,0,0.00)] transition-all duration-200 dark:border-transparent">
          <RiRobot2Line className="size-6 text-black" />
        </div>
      }
    >
      <ChatPopup />
    </ClientSideSuspense>
  )
}

function Chat({ chatId }: { chatId: string }) {
  // Knowledge about the current team, roles, departments
  const { data: team } = useSWR("/api/team")

  // Knowledge about the current user's plan
  const { data: plan } = useSWR("/api/plan")

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
      <MemberToolAi />
      <InviteMemberTool onInvite={() => {}} />
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
  )
}

// Creating a new chat every hour
function getDefaultChatId() {
  return new Date().toISOString().slice(0, 13)
}

function ChatPopup() {
  const [chatId, setChatId] = useState(getDefaultChatId)
  const [showListing, setShowListing] = useState(false)
  const { chat, isLoading } = useAiChat(chatId)
  const deleteAiChat = useDeleteAiChat()

  const goToChat = useCallback((id: string) => {
    setChatId(id)
    setShowListing(false)
  }, [])

  const deleteChat = useCallback(
    (id: string) => {
      deleteAiChat(id)
    },
    [deleteAiChat],
  )

  return (
    <div className="ai-widget-container">
      <PopoverPrimitives.Root defaultOpen={true}>
        <PopoverPrimitives.Trigger asChild>
          <button
            className={
              "fixed right-8 bottom-8 z-40 flex size-14 items-center justify-center rounded-full border border-blue-400/60 bg-blue-600 shadow-[0px_36px_49px_0px_rgba(0,0,0,0.01),0px_15.04px_20.471px_0px_rgba(0,0,0,0.01),0px_8.041px_10.945px_0px_rgba(0,0,0,0.01),0px_4.508px_6.136px_0px_rgba(0,0,0,0.00),0px_2.394px_3.259px_0px_rgba(0,0,0,0.00),0px_0.996px_1.356px_0px_rgba(0,0,0,0.00)] transition-all duration-200 hover:bg-black dark:border-blue-700/60"
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
            className="fixed right-0 bottom-0 z-50 h-[700px] max-h-[75vh] w-[420px] max-w-[90vw] overflow-hidden rounded-xl bg-neutral-50 shadow-[0px_36px_49px_0px_rgba(0,0,0,0.01),0px_15.04px_20.471px_0px_rgba(0,0,0,0.01),0px_8.041px_10.945px_0px_rgba(0,0,0,0.01),0px_4.508px_6.136px_0px_rgba(0,0,0,0.00),0px_2.394px_3.259px_0px_rgba(0,0,0,0.00),0px_0.996px_1.356px_0px_rgba(0,0,0,0.00)] ring-1 ring-neutral-200 will-change-[transform,opacity] dark:border-neutral-800 dark:bg-neutral-950 dark:ring-neutral-800"
          >
            <div className="relative flex h-full w-full flex-col gap-1">
              <div className="flex h-11 shrink-0 items-center justify-between px-4 pt-4">
                <button
                  onClick={() => {
                    // If the current chat is deleted, don't go back to it, create a new one
                    if (chat?.deletedAt) {
                      setChatId(nanoid())
                    }
                    setShowListing(!showListing)
                  }}
                  className="flex h-8 items-center gap-1.5 truncate rounded-md px-3 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <ArrowLeftIcon className="-ml-1 size-4 shrink-0 opacity-70" />
                  {showListing ? (
                    <span>Back</span>
                  ) : (
                    <div className="shrink grow truncate">
                      {isLoading ? null : chat?.title || "Untitled chat"}
                    </div>
                  )}
                </button>

                <span className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={() => goToChat(nanoid())}
                    className="flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <PlusIcon className="-ml-1 size-4 opacity-70" />
                    <span>New chat</span>
                  </button>
                  <PopoverPrimitives.Close className="flex size-8 items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800">
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
  )
}
