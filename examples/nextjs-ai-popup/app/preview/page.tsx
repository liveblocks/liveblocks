"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ClientSideSuspense, useSendAiMessage } from "@liveblocks/react";
import { AiChat } from "@liveblocks/react-ui";
import * as PopoverPrimitives from "@radix-ui/react-popover";
import { nanoid } from "nanoid";
import { useAiChat } from "@liveblocks/react/suspense";

function PreviewPageContent() {
  const searchParams = useSearchParams();
  const [config, setConfig] = useState({
    urlType: "iframe" as "iframe" | "picture",
    url: "",
    theme: "light" as "light" | "dark",
    title: "How can I help you?",
    description: "",
    suggestions: [] as string[]
  });

  useEffect(() => {
    if (searchParams) {
      setConfig({
        urlType: (searchParams.get("urlType") as "iframe" | "picture") || "iframe",
        url: searchParams.get("url") || "",
        theme: (searchParams.get("theme") as "light" | "dark") || "light",
        title: searchParams.get("title") || "How can I help you?",
        description: searchParams.get("description") || "",
        suggestions: searchParams.get("suggestions") ? JSON.parse(searchParams.get("suggestions")!) : []
      });
    }
  }, [searchParams]);

  useEffect(() => {
    document.body.className = config.theme === "dark" ? "dark" : "";
  }, [config.theme]);

  return (
    <div className="relative h-screen overflow-hidden">
      <div className="absolute inset-0">
        {config.url && config.urlType === "iframe" ? (
          <iframe
            src={config.url}
            className="w-full h-full border-0"
            title="Preview Content"
          />
        ) : config.url && config.urlType === "picture" ? (
          <img
            src={config.url}
            alt="Preview Content"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-neutral-100 flex items-center justify-center">
            <p className="text-neutral-500">No content URL provided</p>
          </div>
        )}
      </div>

      <ClientSideSuspense
        fallback={
          <div className="flex size-14 items-center border border-neutral-200 justify-center rounded-full bg-white shadow-lg transition-all fixed bottom-8 right-8 z-40 duration-200">
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
  const [chatId] = useState(() => nanoid());
  const { chat, isLoading } = useAiChat(chatId);

  return (
    <div className="ai-widget-container">
      <PopoverPrimitives.Root defaultOpen={true}>
        <PopoverPrimitives.Trigger asChild>
          <button
            className="flex size-14 items-center border border-neutral-200 justify-center rounded-full bg-white hover:bg-neutral-50 shadow-lg transition-all fixed bottom-8 right-8 z-40 duration-200"
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
            onInteractOutside={(e) => e.preventDefault()}
            className="fixed bottom-0 right-0 z-50 h-[700px] max-h-[75vh] w-[420px] max-w-[90vw] overflow-hidden rounded-xl ring-1 ring-neutral-200 bg-neutral-50 shadow-lg will-change-[transform,opacity]"
          >
            <div className="relative flex h-full w-full flex-col gap-1">
              <div className="flex h-11 shrink-0 items-center justify-between px-4 pt-4">
                <span className="font-medium truncate">{config.title}</span>
                <PopoverPrimitives.Close className="bg-neutral-50 hover:bg-neutral-100 flex size-8 items-center justify-center rounded-full">
                  <span className="sr-only">Close</span>
                  <CloseIcon className="size-4 opacity-70" />
                </PopoverPrimitives.Close>
              </div>
              <div className="relative flex-grow">
                <Chat chatId={chatId} config={config} />
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
      <AiChat
        layout="compact"
        chatId={chatId}
        components={{
          Empty: ({ chatId }) => {
            const sendMessage = useSendAiMessage(chatId);
            return (
              <div className="p-[var(--spacing)] h-full flex flex-col gap-5 justify-end">
                <div>
                  <h3>{config.title}</h3>
                  {config.description && (
                    <p className="text-sm text-neutral-600 mt-1">{config.description}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-start gap-2">
                  {config.suggestions.map((suggestion: string, index: number) => (
                    <button
                      key={index}
                      className="px-3.5 py-1.5 transition-colors rounded-full flex items-center gap-2 bg-white border-neutral-200 border text-sm font-medium shadow-xs hover:bg-neutral-50"
                      onClick={() => sendMessage(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            );
          }
        }}
        className="min-h-0 flex-shrink flex-grow overflow-x-hidden overflow-y-scroll"
      />
    </div>
  );
}

function CloseIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function SparklesIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M17.617 14.034c-4.172 1.378-5.561 2.768-6.94 6.94a.375.375 0 0 1-.711 0c-1.379-4.172-2.768-5.561-6.94-6.94a.375.375 0 0 1 0-.712c4.172-1.378 5.561-2.767 6.94-6.939a.375.375 0 0 1 .711 0c1.379 4.172 2.768 5.561 6.94 6.94a.375.375 0 0 1 0 .711ZM21.102 6.723c-2.085.689-2.78 1.384-3.47 3.47a.187.187 0 0 1-.356 0c-.688-2.085-1.383-2.78-3.47-3.47-.17-.056-.17-.298 0-.355 2.086-.689 2.781-1.384 3.47-3.47.057-.172.3-.172.356 0 .689 2.085 1.384 2.78 3.47 3.47.171.056.171.298 0 .355Z" />
    </svg>
  );
}

export default function PreviewPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PreviewPageContent />
    </Suspense>
  );
}
