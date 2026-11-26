"use client";

import {
  useCreateFeedMessage,
  useRoom,
  useSelf,
} from "@liveblocks/react/suspense";
import { nanoid } from "nanoid";
import { useCallback } from "react";
import type { AgentMessageResponse } from "@/lib/types";

/**
 * Posts a human message to a chat, then asks the server whether the agent
 * should see it. The server runs triage (people can chat among themselves;
 * only messages meant for the agent start a run), and if so decides whether
 * that starts a run right away or queues the message behind the one in
 * progress. It also fills in the chat title from the first message, so
 * metadata is only ever written from one place.
 */
export function useSendMessage() {
  const room = useRoom();
  const self = useSelf();
  const createFeedMessage = useCreateFeedMessage();

  return useCallback(
    async (feedId: string, content: string) => {
      // Choose the id here so the server can be told which message to judge
      const messageId = nanoid();
      await createFeedMessage(
        feedId,
        { role: "user", userId: self.id, content },
        { id: messageId }
      );
      await notifyAgent({ roomId: room.id, feedId, messageId });
    },
    [createFeedMessage, room.id, self.id]
  );
}

/**
 * Sends a message the triage left to the team to the agent after all; shown
 * on such messages to their author.
 */
export function useSendToAgent() {
  const room = useRoom();
  return useCallback(
    (feedId: string, messageId: string) =>
      notifyAgent({ roomId: room.id, feedId, messageId, force: true }),
    [room.id]
  );
}

async function notifyAgent(body: {
  roomId: string;
  feedId: string;
  messageId: string;
  force?: boolean;
}): Promise<AgentMessageResponse> {
  const response = await fetch("/api/agent/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(error?.error ?? "The agent could not be started.");
  }
  // Shape is defined by /api/agent/message
  return (await response.json()) as AgentMessageResponse;
}
