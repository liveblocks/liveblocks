"use client";

import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react/suspense";
import { Loader2Icon } from "lucide-react";
import { createContext, useContext, type ReactNode } from "react";
import type { AccessRole } from "@/lib/types";
import { useExampleRoomId } from "@/lib/example.client";

export type CurrentUser = {
  /** GitHub login, also the Liveblocks user id */
  id: string;
  name: string;
  avatar: string;
  role: AccessRole;
};

const CurrentUserContext = createContext<CurrentUser | null>(null);

/** The signed-in GitHub user, from the server session. */
export function useCurrentUser() {
  const value = useContext(CurrentUserContext);
  if (!value) {
    throw new Error("useCurrentUser must be used inside <Providers>");
  }
  return value;
}

/** Whether the current user may post messages and start agent runs. */
export function useCanWrite() {
  return useCurrentUser().role === "member";
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
 * Everyone shares a single room; each chat is a feed in it. The Liveblocks
 * session is issued server-side from the GitHub sign-in cookie, so the
 * client never says who it is.
 */
export function Providers({
  user,
  children,
}: {
  user: CurrentUser;
  children: ReactNode;
}) {
  const roomId = useExampleRoomId();

  return (
    <CurrentUserContext.Provider value={user}>
      <LiveblocksProvider
        throttle={16}
        authEndpoint="/api/liveblocks-auth"
        // Resolve user info (name, avatar) from GitHub logins.
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
