"use client";

import { nanoid } from "@liveblocks/core";
import {
  ClientSideSuspense,
  useClient,
  useChats,
} from "@liveblocks/react/suspense";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { TrashIcon } from "../icons";

export function LeftSidebar() {
  return (
    <ClientSideSuspense fallback="">
      <ActualLeftSidebar />
    </ClientSideSuspense>
  );
}

function ActualLeftSidebar() {
  const client = useClient();
  const { chats, fetchMore, isFetchingMore, fetchMoreError, hasFetchedAll } =
    useChats();

  // The user-selected chat ID. If nothing is explicitly selected (or the
  // selected chat ID isn't a valid one), the selected chat will be the first
  // one in the list.
  const router = useRouter();
  const selectedChatId = useParams<{ chatId?: string }>().chatId;
  return (
    <>
      <button
        className="create-chat-btn"
        onClick={async () => {
          const name = prompt("Enter a name:", "My chat");
          if (name !== null) {
            const res = await client.ai.createChat(nanoid(7), name);
            router.push(`/chat/${res.chat.id}`);
          }
        }}
      >
        New chat
      </button>
      <button
        className="btn"
        onClick={async () => {
          const name = prompt("Enter a name:", "My ephemeral chat");
          if (name !== null) {
            const res = await client.ai.createChat(nanoid(7), name, {
              ephemeral: true,
            });
            router.push(`/chat/${res.chat.id}`);
          }
        }}
      >
        New ephemeral chat
      </button>

      <div className="chat-list">
        {chats.map((chat) => (
          <div key={chat.id} className="chat-list-item">
            <Link
              className={`chat-list-item-link ${chat.id === selectedChatId ? "active" : ""}`}
              href={`/chat/${chat.id}`}
            >
              {chat.name}
            </Link>
            <button
              className="danger-btn"
              onClick={(e) => {
                e.stopPropagation();
                client.ai.deleteChat(chat.id);
              }}
            >
              <TrashIcon />
            </button>
          </div>
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
          Load more
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
