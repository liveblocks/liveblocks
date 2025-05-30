"use client";

import { useAiChats, useDeleteAiChat } from "@liveblocks/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ComponentProps } from "react";

export function ChatList() {
  const params = useParams();

  const { chats, isLoading, error } = useAiChats();
  const deleteAiChat = useDeleteAiChat();

  if (error) {
    return <div>Problem fetching chats</div>;
  }

  if (isLoading) {
    return null;
  }

  if (!chats) {
    return (
      <div className="px-2 py-1.5 italic text-stone-500">No chats yet</div>
    );
  }

  return (
    <ul className="p-0 m-0 flex flex-col gap-px text-sm">
      {chats.map((chat) => (
        <li
          key={chat.id}
          className={`group list-none px-2 py-1.5 hover:bg-stone-300/50 transition-colors rounded flex justify-between isolate relative gap-2 ${
            params.chatId === chat.id ? "bg-stone-300/50" : ""
          }`}
        >
          <Link href={`/${chat.id}`} className="absolute inset-0" />
          <span className="truncate">{chat.title || "Untitled"}</span>

          {/* TODO: Remove this check when `useAiChat` bug is fixed */}
          {params.chatId !== chat.id ? (
            <button onClick={() => deleteAiChat(chat.id)} className="z-10">
              <TrashIcon className="text-red-600 opacity-70 hover:opacity-100 hidden group-hover:block" />
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function TrashIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <path d="M10 11L10 17" />
      <path d="M14 11L14 17" />
    </svg>
  );
}
