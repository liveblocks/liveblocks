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
import type { ActivityTarget } from "@/components/activity-panel";
import { Chat } from "@/components/chat";
import { Rail, type View } from "@/components/rail";
import { Sidebar } from "@/components/sidebar";
import {
  getDmFeedId,
  type Conversation,
  type MessageHighlight,
  type Selection,
} from "@/lib/conversations";
import { useExamplePreviewIndex, useExampleRoomId } from "@/lib/example.client";
import { DEFAULT_CHANNELS, getWorkspace, WORKSPACES } from "@/lib/workspaces";

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
      DEFAULT_CHANNELS.map((name) => new LiveObject({ id: nanoid(), name }))
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
    <LiveblocksProvider
      key={userId}
      throttle={16}
      authEndpoint={authEndpoint}
      // Resolve user info (name, avatar) from their id.
      resolveUsers={async ({ userIds }) => {
        const search = new URLSearchParams(
          userIds.map((userId) => ["userIds", userId])
        );
        const response = await fetch(`/api/users?${search}`);
        if (!response.ok) {
          throw new Error("Problem resolving users");
        }
        return await response.json();
      }}
      // Find a list of users that match the current search term.
      resolveMentionSuggestions={async ({ text }) => {
        const response = await fetch(
          `/api/users/search?text=${encodeURIComponent(text)}`
        );
        if (!response.ok) {
          throw new Error("Problem resolving mention suggestions");
        }
        return await response.json();
      }}
      // Used when testing against a self-hosted Liveblocks dev server.
      // You can ignore this when running the example yourself.
      baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
    >
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
  const [selection, setSelection] = useState<Selection | null>(null);
  const [openThreadMessageId, setOpenThreadMessageId] = useState<string | null>(
    null
  );
  const [view, setView] = useState<View>("home");
  const [activeActivityItemId, setActiveActivityItemId] = useState<
    string | null
  >(null);
  const [highlight, setHighlight] = useState<MessageHighlight | null>(null);

  const handleSelect = useCallback((nextSelection: Selection) => {
    setSelection(nextSelection);
    setOpenThreadMessageId(null);
    setHighlight(null);
    setActiveActivityItemId(null);
  }, []);

  // Jumping to an activity item lands in a conversation, opens its thread if
  // there is one, and highlights the message it points at.
  const handleActivityNavigate = useCallback((target: ActivityTarget) => {
    setSelection(target.selection);
    setOpenThreadMessageId(target.threadMessageId);
    setHighlight(target.highlight);
    setActiveActivityItemId(target.itemId);
  }, []);

  const handleOpenThread = useCallback((messageId: string | null) => {
    setOpenThreadMessageId(messageId);
    // Opening or closing a thread by hand is a fresh start.
    setHighlight(null);
    setActiveActivityItemId(null);
  }, []);

  // Resolve the sidebar selection into something renderable, falling back to
  // the first channel when the selected channel or user no longer exists.
  const conversation = useMemo<Conversation | undefined>(() => {
    if (selection?.type === "dm") {
      const user = getUser(selection.userId);
      if (user && user.id !== userId) {
        return {
          type: "dm",
          feedId: getDmFeedId(userId, user.id),
          user,
        };
      }
    }

    if (!channels.length) {
      return undefined;
    }

    const channel =
      (selection?.type === "channel"
        ? channels.find((channel) => channel.id === selection.channelId)
        : undefined) ?? channels[0];

    return { type: "channel", feedId: channel.id, channel };
  }, [channels, selection, userId]);

  useEffect(() => {
    if (selection?.type === "dm") {
      const user = getUser(selection.userId);
      if (!user || user.id === userId) {
        setSelection(null);
      }
      return;
    }

    if (!channels.length) {
      setSelection(null);
      return;
    }

    if (
      selection === null ||
      !channels.some((channel) => channel.id === selection.channelId)
    ) {
      setSelection({ type: "channel", channelId: channels[0].id });
    }
  }, [channels, selection, userId]);

  const workspace = getWorkspace(workspaceId);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--sidebar", workspace.theme.sidebar);
    root.style.setProperty("--brand", workspace.theme.brand);
    return () => {
      root.style.removeProperty("--sidebar");
      root.style.removeProperty("--brand");
    };
  }, [workspace.theme.brand, workspace.theme.sidebar]);

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <Rail
        workspaceId={workspaceId}
        userId={userId}
        view={view}
        onViewChange={setView}
        onUserChange={onUserChange}
        onWorkspaceChange={onWorkspaceChange}
      />

      <main className="flex min-w-0 flex-1 flex-col bg-sidebar p-1.5 pl-0">
        <div className="flex min-w-0 flex-1 overflow-hidden rounded-sm bg-white shadow-[-12px_0_28px_-6px_rgba(0,0,0,0.14)]">
          <Sidebar
            workspaceName={workspace.name}
            view={view}
            selection={
              conversation?.type === "dm"
                ? { type: "dm", userId: conversation.user.id }
                : conversation
                  ? { type: "channel", channelId: conversation.channel.id }
                  : null
            }
            activeActivityItemId={activeActivityItemId}
            onSelect={handleSelect}
            onActivityNavigate={handleActivityNavigate}
          />

          <div className="relative z-10 flex min-w-0 flex-1 flex-col bg-white shadow-[-12px_0_28px_-6px_rgba(0,0,0,0.14)]">
            <ClientSideSuspense fallback={null}>
              {conversation ? (
                <Chat
                  key={conversation.feedId}
                  conversation={conversation}
                  openThreadMessageId={openThreadMessageId}
                  highlight={highlight}
                  onOpenThread={handleOpenThread}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-neutral-500">
                  Create a channel to start messaging
                </div>
              )}
            </ClientSideSuspense>
          </div>
        </div>
      </main>
    </div>
  );
}
