"use client";

import { RoomProvider } from "@liveblocks/react";

const INITIAL_CODE = `export default function App() {
  return <div className="text-2xl font-bold p-4">Hello world 👋</div>;
}`;

export function Room({
  children,
  chatId,
}: {
  children: React.ReactNode;
  chatId: string;
}) {
  return (
    <RoomProvider
      id={"liveblocks:examples:nextjs-ai-web-generator:" + chatId}
      initialStorage={{ code: INITIAL_CODE }}
    >
      {children}
    </RoomProvider>
  );
}
