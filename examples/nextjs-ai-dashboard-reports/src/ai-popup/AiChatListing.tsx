import { useAiChats } from "@liveblocks/react";
import { ComponentProps } from "react";

// Show a list of all chats the current user has created, with a delete button for each
export function ChatListing({
  onSelectChat,
  onDeleteChat,
}: {
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
}) {
  // 50 chats loaded by default, more can be fetched with `fetchMore`
  const { chats, error, isLoading, hasFetchedAll, fetchMore, isFetchingMore } =
    useAiChats();

  if (isLoading) {
    return null;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div className="absolute inset-0 flex flex-col gap-2 overflow-auto p-4">
      <ul className="flex flex-col gap-3 pl-0 text-sm">
        {chats.map((chat) => (
          <li
            key={chat.id}
            className="group relative flex items-center justify-between rounded-md border border-neutral-200 bg-white p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-900"
          >
            <div className="flex flex-col gap-1">
              <button
                onClick={() => onSelectChat(chat.id)}
                className="truncate text-left font-medium before:absolute before:inset-0"
              >
                {chat.title || "Untitled chat"}
              </button>
              <div className="text-xs text-neutral-400">
                {new Date(chat.lastMessageAt || chat.createdAt).toLocaleString(
                  "en-US",
                  {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  }
                )}
              </div>
            </div>
            <button
              onClick={() => onDeleteChat(chat.id)}
              className="relative hidden group-hover:block"
              title="Delete chat"
            >
              <TrashIcon className="size-4 text-red-600" />
            </button>
          </li>
        ))}
        {hasFetchedAll ? null : (
          <button
            disabled={isFetchingMore}
            onClick={fetchMore}
            className="rounded-md border border-neutral-200 bg-white py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Load more
          </button>
        )}
      </ul>
    </div>
  );
}

function TrashIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}
