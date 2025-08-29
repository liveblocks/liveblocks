"use client";

import { use } from "react";
import { AiChat } from "@liveblocks/react-ui";
import { LiveblocksProvider } from "@liveblocks/react";

export default function Home({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = use(params);
  return (
    <main className="h-screen w-full">
      <LiveblocksProvider
        authEndpoint="/api/auth/liveblocks"
        // @ts-expect-error
        baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
      >
        <main className="h-screen w-full">
          <AiChat chatId={chatId} />
        </main>
      </LiveblocksProvider>
    </main>
  );
}
