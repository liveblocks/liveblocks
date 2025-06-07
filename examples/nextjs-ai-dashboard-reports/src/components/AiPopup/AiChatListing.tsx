import { useAiChats } from "@liveblocks/react";
import { ComponentProps } from "react";

export function ChatListing({
  onSelectChat,
  onDeleteChat,
}: {
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
}) {
  const { chats, error, isLoading, hasFetchedAll, fetchMore, isFetchingMore } =
    useAiChats();

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        loading...{" "}
      </div>
    );
  }

  if (error) {
    return <div>error: {error.message}</div>;
  }

  return (
    <div className="absolute inset-0 flex flex-col gap-2 overflow-auto p-4">
      <ul className="flex flex-col gap-2 text-sm pl-0">
        {chats.map((chat) => (
          <li
            key={chat.id}
            className="group relative flex items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <div className="flex flex-col gap-0.5">
              {/* TODO hover, full width, chat icon at left, etc */}
              <button
                onClick={() => onSelectChat(chat.id)}
                className="text-left font-medium before:absolute before:inset-0 truncate"
              >
                {chat.title || "Untitled"}
              </button>
              <div className="text-xs text-gray-400">
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
              <TrashIcon className="text-red-600 size-4" />
            </button>
          </li>
        ))}
        {hasFetchedAll ? null : (
          <button
            disabled={isFetchingMore}
            onClick={fetchMore}
            className="text-sm py-2 bg-white border border-gray-200 rounded-md font-medium hover:bg-gray-50"
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
