"use client";

import { AiChat } from "@liveblocks/react-ui";
import { LiveblocksProvider } from "@liveblocks/react/suspense";

export default function Home() {
  return (
    <main className="h-screen w-full">
      <LiveblocksProvider
        authEndpoint="/api/auth/liveblocks"
        // @ts-expect-error
        baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
      >
        <main className="h-screen w-full">
          <AiChat chatId="ai" layout="compact" />
        </main>
      </LiveblocksProvider>
    </main>
  );
}
