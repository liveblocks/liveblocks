"use client";

import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react/suspense";
import { Loader2Icon } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getUser, getUsers } from "@/app/database";
import { useExamplePreviewIndex, useExampleRoomId } from "@/lib/example.client";

const STORAGE_USER_KEY = "liveblocks-coding-agents:user";

type CurrentUserContextValue = {
  userId: string;
  setUserId: (userId: string) => void;
};

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

export function useCurrentUser() {
  const value = useContext(CurrentUserContext);
  if (!value) {
    throw new Error("useCurrentUser must be used inside <Providers>");
  }
  return value;
}

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

export function LoadingScreen() {
  return (
    <div className="flex h-dvh w-full items-center justify-center bg-background text-muted">
      <Loader2Icon className="size-5 animate-spin" aria-hidden />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/**
 * The "login" is fake: a demo user is picked from the dropdown and persisted
 * in localStorage. Everyone shares a single room; each chat is a feed in it.
 */
export function Providers({ children }: { children: ReactNode }) {
  const previewIndex = useExamplePreviewIndex();
  const [userId, setUserIdState] = useState(() =>
    getInitialUserId(previewIndex)
  );
  const roomId = useExampleRoomId();

  useEffect(() => {
    if (previewIndex !== null) {
      const users = getUsers();
      setUserIdState(users[previewIndex % users.length].id);
    }
  }, [previewIndex]);

  const setUserId = useCallback((nextUserId: string) => {
    localStorage.setItem(STORAGE_USER_KEY, nextUserId);
    setUserIdState(nextUserId);
  }, []);

  const authEndpoint = useCallback(
    async (room?: string) => {
      const response = await fetch("/api/liveblocks-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, userId }),
      });
      return await response.json();
    },
    [userId]
  );

  const currentUser = useMemo(
    () => ({ userId, setUserId }),
    [userId, setUserId]
  );

  return (
    <CurrentUserContext.Provider value={currentUser}>
      <LiveblocksProvider
        key={userId}
        throttle={16}
        authEndpoint={authEndpoint}
        // Resolve user info (name, avatar) from their id.
        resolveUsers={async ({ userIds }) => {
          const search = new URLSearchParams(
            userIds.map((id) => ["userIds", id])
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
        >
          <ClientSideSuspense fallback={<LoadingScreen />}>
            {children}
          </ClientSideSuspense>
        </RoomProvider>
      </LiveblocksProvider>
    </CurrentUserContext.Provider>
  );
}
