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
              className="lb-icon"
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

  const { distanceToBottom } = useScrollToBottom(containerRef);

  return (
    <div ref={containerRef} className="lb-root h-full overflow-y-auto">
      <div className="flex flex-col max-w-4xl mx-auto px-2 py-8 gap-4">
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

      <div className="sticky bottom-0 mt-auto mx-auto max-w-4xl">
        <div className="flex absolute -top-12 justify-center w-full pointer-events-none">
          <button
            data-visible={
              distanceToBottom !== null && distanceToBottom > 10
                ? ""
                : undefined
            }
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 hover:bg-gray-50 focus:outline-none opacity-0 transition-opacity duration-200 ease-in-out pointer-events-none data-[visible]:opacity-100 data-[visible]:pointer-events-auto"
            onClick={() => {
              const container = containerRef.current;
              if (container === null) return;

              container.scrollTo({
                top: container.scrollHeight,
                behavior: "smooth",
              });
            }}
          >
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
              className="lb-icon"
            >
              <path d="M14.5 8.5 10 13 5.5 8.5" />
            </svg>
          </button>
        </div>

        <AiChatComposer
          key={chatId}
          chatId={chatId}
          className="pb-6"
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

function useScrollToBottom(elementRef: RefObject<HTMLElement | null>) {
  const [distanceToBottom, setDistanceToBottom] = useState<number | null>(null);

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (element === null) return;

    element.scrollTo({
      top: element.scrollHeight,
      behavior: "instant",
    });
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    if (element === null) return;
    function handleScrollChange() {
      const element = elementRef.current;
      if (element === null) return;
      setDistanceToBottom(
        element.scrollHeight - element.clientHeight - element.scrollTop
      );
    }
    element.addEventListener("scroll", handleScrollChange);
    return () => {
      element.removeEventListener("scroll", handleScrollChange);
    };
  }, []);

  return { distanceToBottom };
}
