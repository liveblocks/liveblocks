"use client";

import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
  useRoom,
  useStorage,
} from "@liveblocks/react/suspense";
import { Loader2Icon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ActivityTarget } from "@/features/activity";
import { createInitialStorage } from "@/features/channels";
import { SignIn, useCurrentUser } from "@/features/users";
import { getWorkspace, WORKSPACES } from "@/features/workspaces";
import { getUser } from "@/lib/database";
import { useExamplePreviewIndex, useExampleRoomId } from "@/lib/example.client";
import { getDmFeedId } from "@/lib/feeds";
import type {
  Conversation,
  MessageHighlight,
  Selection,
  SidebarTab,
} from "@/lib/navigation";
import { readViewState, writeViewState } from "@/lib/view-state";
import { ConversationView } from "@/views/conversation";
import { Rail } from "@/views/rail";
import { Sidebar } from "@/views/sidebar";

const STORAGE_WORKSPACE_KEY = "liveblocks-messaging-app:workspace";

function getInitialWorkspaceId() {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_WORKSPACE_KEY);
    if (stored && WORKSPACES.some((workspace) => workspace.id === stored)) {
      return stored;
    }
  }

  return WORKSPACES[0].id;
}

export function AppLoadingFallback() {
  return (
    <div className="flex h-dvh w-full items-center justify-center bg-white text-neutral-500">
      <Loader2Icon className="size-6 animate-spin" aria-hidden />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function AppShell() {
  const previewIndex = useExamplePreviewIndex();
  const currentUser = useCurrentUser(previewIndex);

  if (currentUser.status === "loading") {
    return <AppLoadingFallback />;
  }

  if (currentUser.status === "signed-out") {
    return <SignIn onSignIn={currentUser.signIn} />;
  }

  return (
    <AuthenticatedApp
      key={currentUser.userId}
      userId={currentUser.userId}
      preview={currentUser.preview}
      onUserChange={currentUser.switchUser}
      onSignOut={currentUser.signOut}
    />
  );
}

function AuthenticatedApp({
  userId,
  preview,
  onUserChange,
  onSignOut,
}: {
  userId: string;
  preview: boolean;
  onUserChange: (userId: string) => Promise<void>;
  onSignOut: (() => Promise<void>) | null;
}) {
  const [workspaceId, setWorkspaceId] = useState(getInitialWorkspaceId);
  const roomId = useExampleRoomId(workspaceId);

  const authEndpoint = useCallback(
    async (room?: string) => {
      const response = await fetch("/api/liveblocks-auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          preview ? { room, previewUserId: userId } : { room }
        ),
      });

      return await response.json();
    },
    [preview, userId]
  );

  const handleWorkspaceChange = useCallback((nextWorkspaceId: string) => {
    localStorage.setItem(STORAGE_WORKSPACE_KEY, nextWorkspaceId);
    setWorkspaceId(nextWorkspaceId);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialStorage = useMemo(() => createInitialStorage(), [roomId]);

  return (
    <LiveblocksProvider
      throttle={16}
      authEndpoint={authEndpoint}
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
      resolveMentionSuggestions={async ({ text }) => {
        const response = await fetch(
          `/api/users/search?text=${encodeURIComponent(text)}`
        );
        if (!response.ok) {
          throw new Error("Problem resolving mention suggestions");
        }
        return await response.json();
      }}
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
            onUserChange={onUserChange}
            onSignOut={onSignOut}
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
  onSignOut,
  onWorkspaceChange,
}: {
  workspaceId: string;
  userId: string;
  onUserChange: (userId: string) => void;
  onSignOut: (() => void) | null;
  onWorkspaceChange: (workspaceId: string) => void;
}) {
  const channels = useStorage((root) => root.channels);
  const room = useRoom();
  const [initialViewState] = useState(() => readViewState(room.id));
  const [selection, setSelection] = useState<Selection | null>(
    initialViewState.selection
  );
  const [openThreadMessageId, setOpenThreadMessageId] = useState<string | null>(
    initialViewState.threadMessageId
  );
  const [view, setView] = useState<SidebarTab>(initialViewState.view);
  const [activeActivityItemId, setActiveActivityItemId] = useState<
    string | null
  >(null);
  const [highlight, setHighlight] = useState<MessageHighlight | null>(null);

  useEffect(() => {
    writeViewState(room.id, {
      view,
      selection,
      threadMessageId: openThreadMessageId,
    });
  }, [openThreadMessageId, room.id, selection, view]);

  const handleSelect = useCallback((nextSelection: Selection) => {
    setSelection(nextSelection);
    setOpenThreadMessageId(null);
    setHighlight(null);
    setActiveActivityItemId(null);
  }, []);

  const handleActivityNavigate = useCallback((target: ActivityTarget) => {
    setSelection(target.selection);
    setOpenThreadMessageId(target.threadMessageId);
    setHighlight(target.highlight);
    setActiveActivityItemId(target.itemId);
  }, []);

  const handleOpenThread = useCallback((messageId: string | null) => {
    setOpenThreadMessageId(messageId);
    setHighlight(null);
    setActiveActivityItemId(null);
  }, []);

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
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
        onSignOut={onSignOut}
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

          <div className="relative flex min-w-0 flex-1 flex-col bg-white shadow-[-12px_0_28px_-6px_rgba(0,0,0,0.14)]">
            <ClientSideSuspense fallback={null}>
              {conversation ? (
                <ConversationView
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
