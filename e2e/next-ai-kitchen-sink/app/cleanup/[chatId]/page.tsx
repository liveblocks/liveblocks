"use client";

import { use, useEffect, useState } from "react";
import { LiveblocksProvider, useDeleteAiChat } from "@liveblocks/react";

function ChatDeleter({ chatId }: { chatId: string }) {
  const deleteChat = useDeleteAiChat();
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      deleteChat(chatId);
      setDeleted(true);
    } catch (err) {
      console.error("Failed to delete chat:", err);
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [deleteChat, chatId]);

  if (error) {
    return <div style={{ color: "red" }}>Error deleting chat: {error}</div>;
  }

  if (deleted) {
    return <div>Chat deleted</div>;
  }

  return <div>Deleting chat...</div>;
}

export default function CleanupPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = use(params);

  return (
    <LiveblocksProvider
      authEndpoint="/api/auth/liveblocks"
      baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
    >
      <ChatDeleter chatId={chatId} />
    </LiveblocksProvider>
  );
}
