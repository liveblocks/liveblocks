"use client";

import { nanoid } from "@liveblocks/core";
import { AiChat } from "@liveblocks/react-ui";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  useAiChats,
} from "@liveblocks/react/suspense";

export default function Home() {
  return (
    <main className="h-screen w-full">
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
          <App />
        </ClientSideSuspense>
      </LiveblocksProvider>
    </main>
  );
}

function App() {
  const { chats } = useAiChats();
  if (chats.length === 0) {
    return (
      <main className="h-screen w-full">
        <AiChat chatId={nanoid()} className="px-4" />
      </main>
    );
  }

  return (
    <main className="h-screen w-full">
      <AiChat chatId={chats[0].id} className="px-4" />
    </main>
  );
}
