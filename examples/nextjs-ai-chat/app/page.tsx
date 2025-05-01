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
        <ClientSideSuspense fallback={null}>
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
