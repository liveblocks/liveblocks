"use client";

import type { LiveFile } from "@liveblocks/client";
import {
  useCreateFeed,
  useCreateFeedMessage,
  useMutation,
  useRoom,
  useSelf,
  useUploadFile,
} from "@liveblocks/react/suspense";
import { useCallback, useRef } from "react";
import type { DocumentInfo } from "@/liveblocks.config";

// Every room has one chat feed
export const CHAT_FEED_ID = "chat";

type SnapshotMessage = Extract<Liveblocks["FeedMessageData"], { kind: "snapshot" }>;

// What a document hands over when the user clicks "Send to chat"
export type SnapshotPayload =
  | { kind: "image"; blob: Blob; width: number; height: number; page?: number }
  | { kind: "html"; html: string };

// Posts messages to the room chat, creating the feed on first use
export function useChat() {
  const room = useRoom();
  const self = useSelf((me) => me.id);
  const createFeed = useCreateFeed();
  const createFeedMessage = useCreateFeedMessage();
  const uploadFile = useUploadFile();
  const ensured = useRef(false);

  const storeSnapshot = useMutation(
    ({ storage }, id: string, file: LiveFile) => {
      storage.get("snapshots").set(id, file);
    },
    []
  );

  const ensureFeed = useCallback(async () => {
    if (ensured.current) return;
    try {
      await createFeed(CHAT_FEED_ID, { metadata: { type: "chat" } });
    } catch {
      // Already exists
    }
    ensured.current = true;
  }, [createFeed]);

  const sendText = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;
      await ensureFeed();
      const data: Liveblocks["FeedMessageData"] = {
        kind: "text",
        userId: self,
        content: trimmed,
      };
      await createFeedMessage(CHAT_FEED_ID, data);
    },
    [createFeedMessage, ensureFeed, self]
  );

  const sendSnapshot = useCallback(
    async (doc: DocumentInfo, payload: SnapshotPayload, caption?: string) => {
      await ensureFeed();
      const base = {
        kind: "snapshot" as const,
        userId: self,
        docId: doc.id,
        docType: doc.type,
        docTitle: doc.title,
        ...(caption?.trim() ? { caption: caption.trim() } : {}),
      };

      let data: SnapshotMessage;
      if (payload.kind === "html") {
        data = { ...base, html: payload.html };
      } else {
        const file = await uploadFile(
          new File(
            [payload.blob],
            `${doc.title.replace(/[^\w.-]+/g, "_")}${payload.page ? `-p${payload.page}` : ""}.png`,
            { type: "image/png" }
          )
        );
        storeSnapshot(file.id, file);
        data = {
          ...base,
          snapshotId: file.id,
          width: payload.width,
          height: payload.height,
          ...(payload.page ? { page: payload.page } : {}),
        };
      }
      await createFeedMessage(CHAT_FEED_ID, data);
    },
    [createFeedMessage, ensureFeed, self, storeSnapshot, uploadFile]
  );

  return { roomId: room.id, sendText, sendSnapshot };
}
