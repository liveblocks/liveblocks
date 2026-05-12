"use client";

import { LiveObject } from "@liveblocks/client";
import { RoomProvider } from "@liveblocks/react/suspense";
import { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { CmsPost } from "../../liveblocks.config";
import { getRoomId } from "../config";

function defaultPost(): CmsPost {
  const today = new Date().toISOString().slice(0, 10);
  return {
    title: "Untitled post",
    slug: "untitled-post",
    excerpt: "",
    body: "",
    publishedAt: today,
  };
}

export function Room({
  postId,
  children,
}: {
  postId: string;
  children: ReactNode;
}) {
  const roomId = useExampleRoomId(getRoomId(postId));

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        cursor: null,
        editingField: null,
      }}
      initialStorage={{
        post: new LiveObject<CmsPost>(defaultPost()),
      }}
    >
      {children}
    </RoomProvider>
  );
}

function useExampleRoomId(roomId: string) {
  const params = useSearchParams();
  const exampleId = params?.get("exampleId");
  return exampleId ? `${roomId}-${exampleId}` : roomId;
}
