"use client";

import Link from "next/link";
import { ComponentProps, useMemo, useState } from "react";

import { nanoid } from "@liveblocks/core";
import { useAiChats, useDeleteAiChat } from "@liveblocks/react";
import { Timestamp } from "@liveblocks/react-ui/primitives";

export default function Chats() {
  const { chats } = useAiChats();
  const deleteAiChat = useDeleteAiChat();
  const [query, setQuery] = useState("");

  // Allow filtering chats by title
  const filteredChats = useMemo(() => {
    if (!query || !chats) {
      return chats;
    }

    return chats.filter(({ title }) =>
      title.toLowerCase().includes(query.toLowerCase())
    );
  }, [query, chats]);

  if (!chats || !filteredChats) {
    return (
      <div className="p-4 flex flex-col justify-center items-center h-full text-neutral-500">
        Loading…
      </div>
    );
  }

  if (!chats.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4">
        <div className="flex justify-center items-center flex-col max-w-sm text-center gap-1">
          <p className="font-medium">Start your first conversation</p>
          <p className="text-neutral-500 text-sm">
            Ask anything, explore ideas, or think out loud. This space will fill
            up as you go. Your chats will appear here.
          </p>
        </div>
        <Link
          href={`/${nanoid()}`}
          className="flex items-center gap-1 rounded-lg font-medium bg-pink-600 hover:bg-pink-700 text-white px-2.5 py-2 text-sm transition-colors mt-4"
        >
          <PlusIcon className="opacity-70 -ml-0.5" />
          New chat
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto pt-12 max-w-[--inner-app-width] px-4">
      <div className="flex justify-between items-center">
        <h1 className="font-semibold text-xl tracking-[-0.01em]">
          Your chat history
        </h1>
        <Link
          href={`/${nanoid()}`}
          className="flex items-center gap-1 rounded-lg font-medium bg-pink-600 hover:bg-pink-700 text-white px-2.5 py-2 text-sm transition-colors"
        >
          <PlusIcon className="opacity-70 -ml-0.5" />
          New chat
        </Link>
      </div>

      <input
        type="text"
        placeholder="Search your chats…"
        className="w-full py-2 px-4 border border-neutral-200 rounded-lg mt-6 mb-4 text-sm h-10 outline-[--accent] placeholder:text-neutral-400"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="mt-1.5 mb-3 text-neutral-600 text-sm">
        {query ? (
          <span>
            Found {filteredChats.length} chats matching "{query}"
          </span>
        ) : (
          <span>
            {chats.length} previous chat{chats.length > 1 && "s"}
          </span>
        )}
      </div>

      {filteredChats.length > 0 && (
        <ul className="flex flex-col gap-3 p-0">
          {filteredChats.map((chat) => (
            <li
              key={chat.id}
              className="group list-none hover:bg-white border border-neutral-200 px-5 py-4 rounded-xl flex justify-between isolate relative gap-2 transition-all"
            >
              <Link href={`/${chat.id}`} className="absolute inset-0" />
              <div>
                <div className="truncate text-sm">
                  {chat.title || "Untitled"}
                </div>
                <div className="text-neutral-500 text-xs mt-0.5">
                  Last message{" "}
                  <Timestamp date={chat.lastMessageAt || chat.createdAt} />
                </div>
              </div>
              <button onClick={() => deleteAiChat(chat.id)} className="z-10">
                <TrashIcon className="text-red-600 size-3.5 hidden group-hover:block" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PlusIcon(props: ComponentProps<"svg">) {
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
      <path d="M5 12h14M12 5v14" />
    </svg>
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
