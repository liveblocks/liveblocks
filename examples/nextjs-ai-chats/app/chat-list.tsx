"use client";

import { useAiChats, useDeleteAiChat } from "@liveblocks/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ComponentProps } from "react";
import { nanoid } from "nanoid";

export function ChatList() {
  const params = useParams();
  const router = useRouter();

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
      <div className="px-2 py-1.5 italic text-neutral-500">No chats yet</div>
    );
  }

  return (
    <ul className="p-0 m-0 flex flex-col gap-px text-sm">
      {chats.map((chat, index) => (
        <li
          key={chat.id}
          className={`group list-none px-2 py-1.5 hover:bg-neutral-300/40 transition-colors rounded flex justify-between isolate relative gap-2 ${
            params.chatId === chat.id ? "bg-neutral-300/40" : ""
          }`}
        >
          <Link href={`/${chat.id}`} className="absolute inset-0" />
          <span className="truncate">{chat.title || "Untitled"}</span>

          <button
            onClick={() => {
              deleteAiChat(chat.id);

              // If this chat was deleted, redirect to the newest chat
              if (params.chatId === chat.id) {
                const newestChat = chats[index === 0 ? 1 : 0];

                // If all chats are deleted, create a new one
                if (!newestChat) {
                  return router.push(nanoid());
                }

                router.push(`/${newestChat.id}`);
              }
            }}
            className="z-10"
          >
            <TrashIcon className="text-red-600 size-3.5 hidden group-hover:block" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function TrashIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-trash-icon lucide-trash"
      {...props}
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}
