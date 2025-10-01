"use client";

import type { CopilotId } from "@liveblocks/core";
import { AiChat } from "@liveblocks/react-ui";
import { LiveblocksProvider } from "@liveblocks/react";
import { use } from "react";

export default function Home({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = use(params);
  const copilotId =
    (process.env.NEXT_PUBLIC_LIVEBLOCKS_DEFAULT_COPILOT_ID as CopilotId) ||
    undefined;
  return (
    <main className="h-screen w-full">
      <LiveblocksProvider
        authEndpoint="/api/auth/liveblocks"
        // @ts-expect-error
        baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
      >
        <main className="h-screen w-full">
          <AiChat chatId={chatId} copilotId={copilotId} />
        </main>
      </LiveblocksProvider>
    </main>
  );
}
