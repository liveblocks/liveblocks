"use client";

import { RoomProvider } from "@liveblocks/react";
export function Room({
  children,
  chatId,
}: {
  children: React.ReactNode;
  chatId: string;
}) {
  return (
    <RoomProvider id={"liveblocks:examples:nextjs-ai-web-generator:" + chatId}>
      {children}
    </RoomProvider>
  );
}
