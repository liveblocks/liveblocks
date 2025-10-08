"use client";

import type { CopilotId, MessageId } from "@liveblocks/core";
import {
  ClientSideSuspense,
  useAiChat,
  useAiChatMessages,
} from "@liveblocks/react/suspense";

import { use, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Select } from "radix-ui";
import { AssistantMessage } from "./assistant-message";
import { ChatComposer } from "./chat-composer";
import { ArrowDownIcon } from "../../icons/arrow-down-icon";
import { UserMessage } from "./user-message";

export default function Page({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = use(params);

  return (
    <main className="h-screen w-full">
      <ClientSideSuspense
        fallback={
          <div className="h-full w-full flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={20}
              height={20}
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              role="presentation"
              className="animate-spin"
            >
              <path d="M3 10a7 7 0 0 1 7-7" />
            </svg>
          </div>
        }
      >
        <Chat chatId={chatId} />
      </ClientSideSuspense>
    </main>
  );
}

function Chat({ chatId }: { chatId: string }) {
  const { chat } = useAiChat(chatId);
  const containerRef = useRef<HTMLDivElement>(null);
  const [distanceToBottom, setDistanceToBottom] = useState<number | null>(null);
  const [lastSubmittedMessageId, setLastSubmittedMessageId] =
    useState<MessageId | null>(null);
  const [copilotId, setCopilotId] = useState<CopilotId | undefined>(
    (process.env.NEXT_PUBLIC_LIVEBLOCKS_DEFAULT_COPILOT_ID as CopilotId) ||
      undefined
  );
  const [branchId, setBranchId] = useState<MessageId | null>(null);
  // @ts-ignore 'branchId' is an internal property of the useAiChatMessages hook
  const { messages } = useAiChatMessages(chatId, { branchId });

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "instant",
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;
    function handleScrollChange() {
      const container = containerRef.current;
      if (container === null) return;
      setDistanceToBottom(
        container.scrollHeight - container.clientHeight - container.scrollTop
      );
    }
    container.addEventListener("scroll", handleScrollChange);
    return () => {
      container.removeEventListener("scroll", handleScrollChange);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    setDistanceToBottom(
      container.scrollHeight - container.clientHeight - container.scrollTop
    );
  }, [messages]);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [lastSubmittedMessageId]);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    const observer = new ResizeObserver(() => {
      const container = containerRef.current;
      if (container === null) return;
      setDistanceToBottom(
        container.scrollHeight - container.clientHeight - container.scrollTop
      );
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, []);

  const title = chat.title || "Untitled";
  const titleClasses = chat.deletedAt
    ? "line-through opacity-50"
    : chat.title === undefined
      ? "opacity-50"
      : "";

  return (
    <div className="relative flex flex-col h-full">
      <div className="sticky top-0 border-b p-4 flex flex-row items-center gap-2 justify-between border-b-neutral-900/5 dark:border-neutral-50/10">
        <div className={`text-sm ${titleClasses}`} data-testid="chat-title">
          {title}
        </div>

        <CopilotSelect copilotId={copilotId} onCopilotIdChange={setCopilotId} />
      </div>

      <div
        ref={containerRef}
        className="flex flex-col flex-1 overflow-y-auto [--lb-ai-chat-container-width:896px]"
      >
        <div className="flex flex-col w-full max-w-4xl mx-auto px-8 pt-8 pb-30 gap-8">
          {messages.map((message) => {
            if (message.role === "user") {
              return (
                <UserMessage
                  key={message.id}
                  message={message}
                  copilotId={copilotId}
                  onBranchChange={setBranchId}
                />
              );
            } else if (message.role === "assistant") {
              return (
                <AssistantMessage
                  key={message.id}
                  message={message}
                  copilotId={copilotId}
                  onBranchChange={setBranchId}
                />
              );
            }
            return null;
          })}
        </div>

        <div className="w-full sticky bottom-0 mt-auto mx-auto max-w-4xl pb-4 bg-white dark:bg-neutral-900 px-4">
          <div className="flex absolute -top-12 justify-center w-full pointer-events-none">
            <button
              data-visible={
                distanceToBottom !== null && distanceToBottom > 100
                  ? ""
                  : undefined
              }
              data-variant="secondary"
              className="rounded-full opacity-0 transition-[opacity,color] duration-200 ease-in-out pointer-events-none data-[visible]:opacity-100 data-[visible]:pointer-events-auto cursor-pointer bg-white hover:bg-neutral-100 inline-flex items-center justify-center p-1.5 shadow size-7.5 ring-1 ring-neutral-950/10 dark:ring-neutral-100/10 dark:bg-neutral-800 dark:hover:bg-neutral-700"
              onClick={() => {
                const container = containerRef.current;
                if (container === null) return;

                container.scrollTo({
                  top: container.scrollHeight,
                  behavior: "smooth",
                });
              }}
            >
              <ArrowDownIcon className="size-4" />
            </button>
          </div>

          <ChatComposer
            chatId={chatId}
            copilotId={copilotId}
            lastMessageId={messages[messages.length - 1]?.id ?? null}
            abortableMessageId={
              messages.find(
                (m) =>
                  m.role === "assistant" &&
                  (m.status === "generating" || m.status === "awaiting-tool")
              )?.id ?? null
            }
            onUserMessageCreate={(id) => {
              setLastSubmittedMessageId(id);
              setBranchId(id);
            }}
          />
        </div>
      </div>
    </div>
  );
}

function CopilotSelect({
  copilotId,
  onCopilotIdChange,
}: {
  copilotId: CopilotId | undefined;
  onCopilotIdChange: (id: CopilotId | undefined) => void;
}) {
  return (
    <Select.Root
      value={copilotId || ""}
      onValueChange={(value) =>
        onCopilotIdChange(
          !value || value === "default" ? undefined : (value as CopilotId)
        )
      }
    >
      <Select.Trigger className="inline-flex text-sm items-center rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 outline-none px-3 py-2 gap-1">
        <Select.Value placeholder="Select a copilot…" />
        <Select.Icon>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={20}
            height={20}
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            role="presentation"
          >
            <path d="M14.5 8.5 10 13 5.5 8.5" />
          </svg>
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="rounded-md shadow-sm bg-white dark:bg-neutral-900 ring-1 ring-neutral-950/10 dark:ring-neutral-100/10">
          <Select.Viewport className="p-1 flex flex-col">
            <Select.Item
              value={
                (process.env
                  .NEXT_PUBLIC_LIVEBLOCKS_DEFAULT_COPILOT_ID as CopilotId) ||
                "default" // Cannot use undefined or empty string here, as Select.Item requires a value
              }
              className="relative inline-flex select-none text-sm h-8 items-center pl-6 pr-6 gap-2 py-0.5 data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-800 outline-none rounded-sm"
            >
              <Select.ItemIndicator className="absolute left-1 inline-flex size-4 items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={20}
                  height={20}
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  role="presentation"
                >
                  <path d="M16 6L8 14L4 10" />
                </svg>
              </Select.ItemIndicator>
              <Select.ItemText>Default copilot</Select.ItemText>
            </Select.Item>

            {/* Custom copilots - Make sure to use valid copilot ids */}
            {(process.env.NEXT_PUBLIC_AVAILABLE_COPILOT_IDS ?? "")
              .split(",")
              .map((copilot) =>
                copilot ? (
                  <Select.Item
                    key={copilot.split(":")[1]}
                    value={copilot.split(":")[1]}
                    className="relative inline-flex select-none text-sm h-8 items-center pl-6 pr-6 gap-2 py-0.5 data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-800 outline-none rounded-sm"
                  >
                    <Select.ItemIndicator className="absolute left-1 inline-flex size-4 items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width={20}
                        height={20}
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        role="presentation"
                      >
                        <path d="M16 6L8 14L4 10" />
                      </svg>
                    </Select.ItemIndicator>
                    <Select.ItemText>{copilot.split(":")[0]}</Select.ItemText>
                  </Select.Item>
                ) : null
              )}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
