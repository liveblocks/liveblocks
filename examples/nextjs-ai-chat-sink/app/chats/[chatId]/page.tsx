"use client";

import {
  ClientSideSuspense,
  LiveblocksProvider,
} from "@liveblocks/react/suspense";
import { AiChat } from "@liveblocks/react-ui";
import { use } from "react";

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
          <AiChat chatId={chatId} className="px-4" />
        </main>
      </ClientSideSuspense>
    </LiveblocksProvider>
  );
}
