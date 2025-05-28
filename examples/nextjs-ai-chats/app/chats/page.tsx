"use client";

import { Timestamp } from "@liveblocks/react-ui/primitives";
import { useAiChats, useDeleteAiChat } from "@liveblocks/react";
import Link from "next/link";
import { ComponentProps, useMemo, useState } from "react";
import { nanoid } from "@liveblocks/core";

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
    return <div className="px-2 py-1.5 italic text-stone-500">Loading...</div>;
  }

  return (
    <div style={{ width: "var(--inner-app-width)" }} className="mx-auto pt-16">
      <div className="flex justify-between items-center">
        <h1 className="font-serif font-normal text-3xl">Your chat history</h1>
        <Link
          href={`/${nanoid}`}
          className="flex items-center gap-1 rounded-lg bg-orange-700 hover:bg-orange-600 text-white px-2.5 py-2 text-sm transition-colors"
        >
          <PlusIcon />
          New chat
        </Link>
      </div>

      <input
        type="text"
        placeholder="Search your chats…"
        className="w-full py-2 px-4 border border-stone-300 rounded-lg mt-5 mb-4 outline-[--accent]"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="mt-1.5 mb-3 text-stone-600">
        {query
          ? `There are ${filteredChats.length} chats matching "${query}"`
          : `You have ${chats.length} previous chats`}
      </div>

      {!chats?.length || !filteredChats?.length ? (
        <div className="px-2 py-1.5 italic text-stone-500">
          {chats.length === 0 ? "No chats yet" : "No matching chats"}
        </div>
      ) : (
        <ul className="flex flex-col gap-2 text-sm p-0">
          {filteredChats.map((chat) => (
            <li
              key={chat.id}
              className="group list-none hover:bg-white border border-neutral-300 px-5 py-4 rounded-xl flex justify-between isolate relative gap-2  transition-all"
            >
              <Link href={`/${chat.id}`} className="absolute inset-0" />
              <div>
                <div className="truncate text-lg">
                  {chat.title || "Untitled"}
                </div>
                <div className="text-stone-500">
                  Last message{" "}
                  <Timestamp date={chat.lastMessageAt || chat.createdAt} />
                </div>
              </div>
              <button onClick={() => deleteAiChat(chat.id)} className="z-10">
                <TrashIcon className="size-[18px] text-red-600 opacity-70 hover:opacity-100 hidden group-hover:block" />
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
