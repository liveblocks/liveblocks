"use client";

import {
  useCreateFeedMessage,
  useRoom,
  useSelf,
  useUpdateFeedMetadata,
} from "@liveblocks/react/suspense";
import { useCallback } from "react";
import { deriveTitle } from "@/lib/prompt";

/**
 * Posts a human message to a chat, then asks the server to run the agent.
 * The server decides whether that starts a run right away or queues the
 * message behind the one in progress.
 */
export function useSendMessage() {
  const room = useRoom();
  const self = useSelf();
  const createFeedMessage = useCreateFeedMessage();
  const updateFeedMetadata = useUpdateFeedMetadata();

  return useCallback(
    async (
      feedId: string,
      content: string,
      options: { setTitle?: boolean } = {}
    ) => {
      await createFeedMessage(feedId, {
        role: "user",
        userId: self.id,
        content,
      });

      if (options.setTitle) {
        updateFeedMetadata(feedId, { title: deriveTitle(content) });
      }

      const response = await fetch("/api/agent/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: room.id, feedId }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "The agent could not be started.");
      }
    },
    [createFeedMessage, room.id, self.id, updateFeedMetadata]
  );
}
