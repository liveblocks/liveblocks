"use client";

// Learn how to structure your collaborative Next.js app
// https://liveblocks.io/docs/guides/how-to-use-liveblocks-with-nextjs-app-directory

import { AiChat } from "@liveblocks/react-ui";
import { useState } from "react";
import { nanoid } from "nanoid";

export default function Page() {
  const [newChatId] = useState(nanoid);

  return (
    <div className="p-4 absolute inset-0 flex flex-col justify-center items-center">
      <div className="max-w-[660px] w-full">
        <h1 className="text-5xl font-serif font-normal text-center">
          Hey, how are you?
        </h1>
        <AiChat
          chatId={newChatId}
          className="h-[160px]"
          onSubmit={console.log}
        />
      </div>
    </div>
  );
}
