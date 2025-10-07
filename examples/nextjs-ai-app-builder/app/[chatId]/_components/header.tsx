"use client";

import { ErrorBoundary } from "react-error-boundary";
import { ClientSideSuspense, useAiChat } from "@liveblocks/react";

import { NewLink } from "./new-link";

export function Header({ chatId }: { chatId: string }) {
  return (
    <div className="flex items-center justify-between p-2.5 pb-0">
      <ErrorBoundary fallback={<div>Problem loading chat title</div>}>
        <ClientSideSuspense
          fallback={
            // Loading placeholder around title
            <div className="shrink-0 h-8 p-4 relative flex items-center">
              <div className="h-6 rounded-lg w-16 bg-neutral-100 animate-pulse"></div>
            </div>
          }
        >
          <Title chatId={chatId} />
        </ClientSideSuspense>
      </ErrorBoundary>
      <NewLink />
    </div>
  );
}

// Title is automatically generated from the first message and reply
function Title({ chatId }: { chatId: string }) {
  const { chat } = useAiChat(chatId);

  return (
    <div className="h-8 flex items-center text-sm font-medium">
      {chat?.title || "Untitled"}
    </div>
  );
}
