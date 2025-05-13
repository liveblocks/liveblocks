"use client";

import { nanoid } from "@liveblocks/core";
import {
  ClientSideSuspense,
  useAiChats,
  useDeleteAiChat,
} from "@liveblocks/react/suspense";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Page() {
  return (
    <ClientSideSuspense
      fallback={
        <div className="h-screen w-full flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={20}
            height={20}
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            role="presentation"
            className="lb-icon"
          >
            <path d="M3 10a7 7 0 0 1 7-7" className="lb-icon-spinner" />
          </svg>
        </div>
      }
    >
      <Chats />
    </ClientSideSuspense>
  );
}

function Chats() {
  const { chats } = useAiChats();
  const router = useRouter();
  const deleteAiChat = useDeleteAiChat();

  return (
    <main className="h-screen w-full max-w-4xl mx-auto flex p-4 py-8 flex-col">
      <div className="flex flex-col gap-4 mb-4">
        <button
          className="inline-flex underline"
          onClick={() => {
            router.push(`/chats/${nanoid()}`);
          }}
        >
          Start a new AI chat
        </button>
      </div>

      <h1 className="text-2xl font-bold mb-4">List of all chats</h1>

      <div className="flex flex-col gap-4">
        {chats.map((chat) => {
          return (
            <div key={chat.id} className="flex flex-row gap-2 items-center">
              <Link href={`/chats/${chat.id}`}>
                {chat.title ? (
                  chat.title
                ) : (
                  <span className="text-gray-500">Untitled</span>
                )}
              </Link>
              <button
                onClick={() => {
                  deleteAiChat(chat.id);
                }}
                className="inline-flex underline"
              >
                Delete
              </button>
            </div>
          );
        })}
      </div>
    </main>
  );
}
