"use client";

import { useAiChats, useDeleteAiChat } from "@liveblocks/react";
import Link from "next/link";
import { useParams } from "next/navigation";

export function ChatList() {
  const { chats } = useAiChats();
  const params = useParams();
  const deleteAiChat = useDeleteAiChat();

  if (!chats) {
    return (
      <div className="px-2 py-1.5 italic text-stone-500">No chats yet</div>
    );
  }

  console.log(chats);

  return (
    <ul className="p-0 m-0 flex flex-col gap-px text-sm">
      {chats.map((chat) => (
        <li
          key={chat.id}
          className={`list-none px-2 py-1.5 truncate hover:bg-stone-300/50 transition-colors rounded flex justify-between isolate relative ${
            params.chatId === chat.id ? "bg-stone-300/50" : ""
          }`}
        >
          <Link href={`/${chat.id}`} className="absolute inset-0" />
          <span>{chat.title || "Untitled"}</span>
          <button onClick={() => deleteAiChat(chat.id)} className="z-10">
            ❌
          </button>
        </li>
      ))}
    </ul>
  );
}
