"use client";

import { useAiChats } from "@liveblocks/react";
import Link from "next/link";
import { useParams } from "next/navigation";

export function ChatList() {
  const { chats } = useAiChats();
  const params = useParams();

  if (!chats) {
    return null;
  }

  console.log(chats);

  return (
    <ul className="p-0 m-0 flex flex-col gap-px text-sm">
      {chats.map((chat) => (
        <li
          key={chat.id}
          className={`list-none px-2 py-1.5 truncate hover:bg-stone-300/50 transition-colors rounded ${
            params.chatId === chat.id ? "bg-stone-300/50" : ""
          }`}
        >
          <Link href={`/${chat.id}`}>{chat.name}</Link>
        </li>
      ))}
    </ul>
  );
}
