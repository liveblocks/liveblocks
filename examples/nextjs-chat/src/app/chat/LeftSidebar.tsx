"use client";

import { ChatId } from "@liveblocks/core";
import {
  ClientSideSuspense,
  useClient,
  useCopilotChats,
} from "@liveblocks/react/suspense";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { TrashIcon } from "../icons";

export function LeftSidebar() {
  return (
    <ClientSideSuspense fallback="">
      <RealLeftSidebar />
    </ClientSideSuspense>
  );
}

function RealLeftSidebar() {
  const client = useClient();
  const { chats, fetchMore, isFetchingMore, fetchMoreError, hasFetchedAll } =
    useCopilotChats();

  // The user-selected chat ID. If nothing is explicitly selected (or the
  // selected chat ID isn't a valid one), the selected chat will be the first
  // one in the list.
  const router = useRouter();
  const selectedChatId = useParams<{ chatId?: ChatId }>().chatId;
  return (
    <>
      <button
        className="create-chat-btn"
        onClick={async () => {
          const name = prompt(
            'Enter a name:\n\n(Include "tmp" to create an ephemeral chat.)',
            "My new chat"
          );
          if (name !== null) {
            const ephemeral = /\btmp\b/.test(name);
            const res = await client.ai.createChat(
              name.replace(/\btmp\b/g, "").trim(),
              { ephemeral }
            );
            router.push(`/chat/${res.chat.id}`);
          }
        }}
      >
        New Chat
      </button>

      <div className="chat-list">
        {chats.map((chat) => (
          <Link
            key={chat.id}
            href={`/chat/${chat.id}`}
            className={`chat-list-item ${chat.id === selectedChatId ? "active" : ""}`}
          >
            {chat.name}
            <button
              className="danger-btn"
              onClick={(e) => {
                e.stopPropagation();
                client.ai.deleteChat(chat.id);
              }}
            >
              <TrashIcon />
            </button>
          </Link>
        ))}

        {chats.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "20px 0",
              color: "#777",
            }}
          >
            No chats yet. Create your first chat!
          </div>
        )}
      </div>

      {isFetchingMore ? (
        <div style={{ textAlign: "center", padding: "10px" }}>
          Loading more chats...
        </div>
      ) : (
        <button
          className="load-more-chats-btn"
          style={{
            cursor: isFetchingMore || hasFetchedAll ? "not-allowed" : "pointer",
            opacity: isFetchingMore || hasFetchedAll ? 0.5 : 1,
          }}
          onClick={fetchMore}
        >
          Load More Chats
        </button>
      )}
      {fetchMoreError && (
        <div style={{ color: "red", marginBottom: "10px" }}>
          Failed to get more: {fetchMoreError.message}
        </div>
      )}
    </>
  );
}
