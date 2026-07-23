"use client";

import { LiveList, LiveObject } from "@liveblocks/client";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
  useStorage,
} from "@liveblocks/react/suspense";
import { Loader2Icon } from "lucide-react";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getUser, getUsers } from "@/app/database";
import { Chat } from "@/components/chat";
import { Sidebar } from "@/components/sidebar";
import { useExamplePreviewIndex, useExampleRoomId } from "@/lib/example.client";
import {
  DEFAULT_CHANNELS,
  WORKSPACES,
  type Channel,
} from "@/lib/workspaces";

const STORAGE_USER_KEY = "liveblocks-messaging-app:user";
const STORAGE_WORKSPACE_KEY = "liveblocks-messaging-app:workspace";

function getInitialUserId(previewIndex: number | null) {
  const users = getUsers();
  if (previewIndex !== null) {
    return users[previewIndex % users.length].id;
  }

  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_USER_KEY);
    if (stored && getUser(stored)) {
      return stored;
    }
  }

  return users[0].id;
}

function getInitialWorkspaceId() {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_WORKSPACE_KEY);
    if (stored && WORKSPACES.some((workspace) => workspace.id === stored)) {
      return stored;
    }
  }

  return WORKSPACES[0].id;
}

function createInitialStorage() {
  return {
    channels: new LiveList(
      DEFAULT_CHANNELS.map(
        (name) => new LiveObject({ id: nanoid(), name })
      )
    ),
  };
}

export function AppLoadingFallback() {
  return (
    <div className="flex h-dvh w-full items-center justify-center bg-white text-neutral-500">
      <Loader2Icon className="size-6 animate-spin" aria-hidden />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function App() {
  const previewIndex = useExamplePreviewIndex();
  const [userId, setUserId] = useState(() => getInitialUserId(previewIndex));
  const [workspaceId, setWorkspaceId] = useState(getInitialWorkspaceId);

  useEffect(() => {
    if (previewIndex !== null) {
      const users = getUsers();
      setUserId(users[previewIndex % users.length].id);
    }
  }, [previewIndex]);

  const roomId = useExampleRoomId(workspaceId);

  const authEndpoint = useCallback(
    async (room?: string) => {
      const response = await fetch("/api/liveblocks-auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ room, userId }),
      });

      return await response.json();
    },
    [userId]
  );

  const handleUserChange = useCallback((nextUserId: string) => {
    localStorage.setItem(STORAGE_USER_KEY, nextUserId);
    setUserId(nextUserId);
  }, []);

  const handleWorkspaceChange = useCallback((nextWorkspaceId: string) => {
    localStorage.setItem(STORAGE_WORKSPACE_KEY, nextWorkspaceId);
    setWorkspaceId(nextWorkspaceId);
  }, []);

  const initialStorage = useMemo(() => createInitialStorage(), [roomId]);

  return (
    <LiveblocksProvider key={userId} authEndpoint={authEndpoint}>
      <RoomProvider
        key={roomId}
        id={roomId}
        initialPresence={{ typingIn: null }}
        initialStorage={initialStorage}
      >
        <ClientSideSuspense fallback={<AppLoadingFallback />}>
          <MessagingShell
            workspaceId={workspaceId}
            userId={userId}
            onUserChange={handleUserChange}
            onWorkspaceChange={handleWorkspaceChange}
          />
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}

function MessagingShell({
  workspaceId,
  userId,
  onUserChange,
  onWorkspaceChange,
}: {
  workspaceId: string;
  userId: string;
  onUserChange: (userId: string) => void;
  onWorkspaceChange: (workspaceId: string) => void;
}) {
  const channels = useStorage((root) => root.channels);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);

  const activeChannel = useMemo<Channel | undefined>(() => {
    if (!channels.length) {
      return undefined;
    }

    return (
      channels.find((channel) => channel.id === activeChannelId) ?? channels[0]
    );
  }, [activeChannelId, channels]);

  useEffect(() => {
    if (!channels.length) {
      setActiveChannelId(null);
      return;
    }

    if (
      activeChannelId === null ||
      !channels.some((channel) => channel.id === activeChannelId)
    ) {
      setActiveChannelId(channels[0].id);
    }
  }, [activeChannelId, channels]);

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <Sidebar
        workspaceId={workspaceId}
        userId={userId}
        activeChannelId={activeChannel?.id ?? null}
        onSelectChannel={setActiveChannelId}
        onUserChange={onUserChange}
        onWorkspaceChange={onWorkspaceChange}
      />

      <main className="flex min-w-0 flex-1 flex-col bg-white">
        {activeChannel ? (
          <Chat key={activeChannel.id} channel={activeChannel} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-neutral-500">
            Create a channel to start messaging
          </div>
        )}
      </main>
    </div>
  );
}
