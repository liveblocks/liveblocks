"use client";

import {
  ClientSideSuspense,
  useAiChatMessages,
} from "@liveblocks/react/suspense";
import {
  AiChatUserMessage,
  AiChatAssistantMessage,
  AiChatComposer,
} from "@liveblocks/react-ui/_private";
import { use, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Select } from "radix-ui";
import { CopilotId, MessageId } from "@liveblocks/core";

export default function Page({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = use(params);

  return (
    <main className="lb-root h-screen w-full">
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
            >
              <path d="M3 10a7 7 0 0 1 7-7" className="lb-icon-spinner" />
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
  const { messages } = useAiChatMessages(chatId);
  const containerRef = useRef<HTMLDivElement>(null);
  const [distanceToBottom, setDistanceToBottom] = useState<number | null>(null);
  const [lastSubmittedMessageId, setLastSubmittedMessageId] =
    useState<MessageId | null>(null);
  const [copilotId, setCopilotId] = useState<CopilotId | "default">("default");

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

  return (
    <div className="relative flex flex-col h-full">
      <div className="sticky top-0 border-b border-[var(--lb-foreground-subtle)] p-4 flex flex-row items-center gap-2">
        <CopilotSelect copilotId={copilotId} onCopilotIdChange={setCopilotId} />
      </div>

      <div
        ref={containerRef}
        className="flex flex-col flex-1 overflow-y-auto [--lb-ai-chat-container-width:896px]"
      >
        <div className="flex flex-col w-full max-w-4xl mx-auto px-8 pt-8 pb-30 gap-4">
          {messages.map((message) => {
            if (message.role === "user") {
              return (
                <AiChatUserMessage
                  key={message.id}
                  message={message}
                  className="max-w-[80%] ml-auto"
                />
              );
            } else if (message.role === "assistant") {
              return (
                <AiChatAssistantMessage
                  key={message.id}
                  message={message}
                  className="w-full"
                  // @ts-ignore
                  showActions={true}
                  showRegenerate={true}
                  copilotId={copilotId === "default" ? undefined : copilotId}
                />
              );
            }
            return null;
          })}
        </div>

        <div className="w-full sticky bottom-0 mt-auto mx-auto max-w-4xl pb-4 before:content-[''] before:absolute before:inset-0 before:bg-[var(--lb-background)] px-4">
          <div className="flex absolute -top-12 justify-center w-full pointer-events-none">
            <button
              data-visible={
                distanceToBottom !== null && distanceToBottom > 100
                  ? ""
                  : undefined
              }
              data-variant="secondary"
              className="rounded-full opacity-0 transition-[opacity,color] duration-200 ease-in-out pointer-events-none data-[visible]:opacity-100 data-[visible]:pointer-events-auto cursor-pointer bg-[var(--lb-dynamic-background)] text-[var(--lb-foreground-moderate)] hover:text-[var(--lb-foreground-secondary)] inline-flex items-center justify-center p-1.5 shadow-[0_0_0_1px_#0000000a,0_2px_6px_#00000014,0_8px_26px_#0000001f] dark:shadow-[inset_0_0_0_1px_#ffffff0f]"
              onClick={() => {
                const container = containerRef.current;
                if (container === null) return;

                container.scrollTo({
                  top: container.scrollHeight,
                  behavior: "smooth",
                });
              }}
            >
              <span className="size-5">
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
                  <path d="M10 4v12m6-6-6 6-6-6" />
                </svg>
              </span>
            </button>
          </div>

          <AiChatComposer
            key={chatId}
            chatId={chatId}
            copilotId={copilotId === "default" ? undefined : copilotId}
            className="rounded-2xl shadow-[0_0_0_1px_rgb(0_0_0/4%),0_2px_6px_rgb(0_0_0/4%),0_8px_26px_rgb(0_0_0/6%)] dark:shadow-[inset_0_0_0_1px_#ffffff0f]"
            // @ts-ignore
            onUserMessageCreate={({ id }) => {
              console.log("User message created", id);
              setLastSubmittedMessageId(id);
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
  copilotId: CopilotId | "default";
  onCopilotIdChange: (id: CopilotId | "default") => void;
}) {
  return (
    <Select.Root value={copilotId} onValueChange={onCopilotIdChange}>
      <Select.Trigger className="inline-flex text-sm items-center rounded-lg hover:bg-[var(--lb-background-foreground-faint)] outline-none px-3 py-2 gap-1">
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
        <Select.Content className="rounded-md shadow-[0_0_0_1px_#00000014,0_2px_6px_#00000014,0_8px_26px_#00000014] bg-[var(--lb-background)]">
          <Select.Viewport className="p-1 flex flex-col">
            <Select.Item
              value="default"
              className="relative inline-flex select-none text-sm h-8 items-center pl-6 pr-6 gap-2 py-0.5 data-[highlighted]:bg-[var(--lb-foreground-subtle)] data-[highlighted]:text-[var(--lb-foreground-secondary)] outline-none rounded-sm"
            >
              {/* Default copilot */}
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
                    className="relative inline-flex select-none text-sm h-8 items-center pl-6 pr-6 gap-2 py-0.5 data-[highlighted]:bg-[var(--lb-foreground-subtle)] data-[highlighted]:text-[var(--lb-foreground-secondary)] outline-none rounded-sm"
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
