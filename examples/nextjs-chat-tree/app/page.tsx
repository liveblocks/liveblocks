"use client";

import { ChatMessages, ChatComposer } from "@liveblocks/react-ui";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  useChatMessages,
  useCopilotChats,
} from "@liveblocks/react/suspense";
import Image from "next/image";

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
            <div className="h-full w-full flex items-center justify-center">
              <Image
                src="https://liveblocks.io/loading.svg"
                alt="Loading"
                width={64}
                height={64}
                className="opacity-20"
              />
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
  const { chats } = useCopilotChats();
  if (chats.length === 0) throw new Error("No chats found");
  const chatId = chats[0].id;

  const { messages } = useChatMessages(chatId);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-1 overflow-y-auto pt-10 pb-4">
        <ChatMessages
          messages={messages}
          className="max-w-[896px] px-6 py-2 mx-auto flex flex-col gap-6"
        />
      </div>

      <div className="pb-4 px-4">
        <ChatComposer
          chatId={chatId}
          className="rounded-lg mx-auto w-full max-w-[896px] shadow-[0_0_1px_rgb(0_0_0/4%),0_2px_6px_rgb(0_0_0/4%),0_8px_26px_rgb(0_0_0/6%)]"
        />
      </div>
    </div>
  );
}
