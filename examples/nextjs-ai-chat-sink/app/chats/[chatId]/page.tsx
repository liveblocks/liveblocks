"use client";

import {
  ClientSideSuspense,
  LiveblocksProvider,
  useAiChatMessages,
} from "@liveblocks/react/suspense";
import {
  AiChatUserMessage,
  AiChatAssistantMessage,
  AiChatComposer,
} from "@liveblocks/react-ui/_private";
import {
  RefObject,
  use,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export default function Page({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = use(params);

  return (
    <LiveblocksProvider
      authEndpoint="/api/auth/liveblocks"
      // @ts-expect-error
      baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
    >
      <ClientSideSuspense
        fallback={
          <div className="lb-root h-screen w-full flex items-center justify-center">
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
        <main className="h-screen w-full">
          <Chat chatId={chatId} />
        </main>
      </ClientSideSuspense>
    </LiveblocksProvider>
  );
}

function Chat({ chatId }: { chatId: string }) {
  const { messages } = useAiChatMessages(chatId);
  const containerRef = useRef<HTMLDivElement>(null);

  const [distanceToBottom, setDistanceToBottom] = useState<number | null>(null);

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
    <div
      ref={containerRef}
      className="flex flex-col h-full overflow-y-auto [--lb-ai-chat-container-width:896px]"
    >
      <div className="flex flex-col w-full max-w-4xl mx-auto px-8 py-8 gap-4">
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
                showActions={true}
                showRegenerate={true}
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
              distanceToBottom !== null && distanceToBottom > 10
                ? ""
                : undefined
            }
            data-variant="secondary"
            className="rounded-full opacity-0 transition-all duration-200 ease-in-out pointer-events-none data-[visible]:opacity-100 data-[visible]:pointer-events-auto bg-[var(--lb-foreground-subtle)] text-[var(--lb-foreground-tertiary)] hover:bg-[var(--lb-foreground)] hover:text-[var(--lb-background)] inline-flex items-center justify-center p-2 shadow-[0_0_0_1px_#0000000a,0_2px_6px_#0000000f,0_8px_26px_#00000014] hover:shadow-[0_0_0_1px_#00000014,0_2px_6px_#00000014,0_8px_26px_#00000014]"
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
                <path d="M14.5 8.5 10 13 5.5 8.5" />
              </svg>
            </span>
          </button>
        </div>

        <AiChatComposer
          key={chatId}
          chatId={chatId}
          className="dark:shadow-[inset_0_0_0_1px_#ffffff0f] rounded-2xl shadow-[inset_0_0_0_1px_#0000000f]"
          onComposerSubmit={() => {
            const container = containerRef.current;
            if (container === null) return;
            container.scrollTo({
              top: container.scrollHeight,
              behavior: "smooth",
            });
          }}
        />
      </div>
    </div>
  );
}
