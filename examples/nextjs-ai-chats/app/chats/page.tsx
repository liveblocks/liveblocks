"use client";

import { Timestamp } from "@liveblocks/react-ui/primitives";
import { useAiChats, useDeleteAiChat } from "@liveblocks/react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ComponentProps } from "react";

export default function Chats() {
  const { chats } = useAiChats();
  const deleteAiChat = useDeleteAiChat();

  if (!chats) {
    return (
      <div className="px-2 py-1.5 italic text-stone-500">No chats yet</div>
    );
  }

  console.log(chats);

  return (
    <div style={{ width: "var(--inner-app-width)" }} className="mx-auto pt-16">
      <h1>Your chat history</h1>
      <div className="mt-1.5 mb-3 text-stone-600">
        You have {chats.length} previous chats
      </div>
      <ul className="flex flex-col gap-2 text-sm p-0">
        {chats.map((chat) => (
          <li
            key={chat.id}
            className="group list-none hover:bg-stone-50 border border-neutral-300 px-5 py-4 rounded-xl flex justify-between isolate relative gap-2  transition-all"
          >
            <Link href={`/${chat.id}`} className="absolute inset-0" />
            <div>
              <div className="truncate text-lg">{chat.title || "Untitled"}</div>
              <div className="text-stone-500">
                Last message{" "}
                <Timestamp date={chat.lastMessageAt || chat.createdAt} />
              </div>
            </div>
            <button
              onClick={() => {
                console.log(chat.id);
                deleteAiChat(chat.id);
                redirect(`/${chats[0].id}`);
              }}
              className="z-10"
            >
              <TrashIcon className="size-[18px] text-red-600 opacity-70 hover:opacity-100 hidden group-hover:block" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TrashIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
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
