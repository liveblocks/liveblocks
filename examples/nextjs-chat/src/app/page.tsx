"use client";

import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
  useCopilotChatMessages,
} from "@liveblocks/react/suspense";
import { Composer } from "./composer-v2";
import { ChatMessages } from "./message-v2";
import { useLayoutEffect, useRef } from "react";

export default function Page() {
  return (
    <main>
      <LiveblocksProvider
        authEndpoint="/api/liveblocks-auth"
        // @ts-expect-error
        baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
      >
        <ClientSideSuspense
          fallback={
            <div className="loading">
              <img src="https://liveblocks.io/loading.svg" alt="Loading" />
            </div>
          }
        >
          <RoomProvider id="liveblocks:examples:ai">
            <Chat />
          </RoomProvider>
        </ClientSideSuspense>
      </LiveblocksProvider>
    </main>
  );
}

function Chat() {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { messages, fetchMore, isFetchingMore, hasFetchedAll } =
    useCopilotChatMessages("ai");

  useLayoutEffect(() => {
    if (messagesContainerRef.current === null) return;
    messagesContainerRef.current.scrollTo({
      top: messagesContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  return (
    <>
      {/* A button to load more threads which is disabled while fetching new threads and hidden when there is nothing more to fetch */}
      {!hasFetchedAll && (
        <button
          onClick={fetchMore}
          disabled={isFetchingMore}
          className="button primary"
        >
          {isFetchingMore ? "…" : "Load more"}
        </button>
      )}

      <ChatMessages messages={messages} ref={messagesContainerRef} />

      <div className="composer-container">
        <Composer chatId="ai" className="composer" />
      </div>
    </>
  );
}
