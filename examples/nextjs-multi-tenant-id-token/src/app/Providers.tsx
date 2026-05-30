"use client";

import { LiveblocksProvider } from "@liveblocks/react";
import { PropsWithChildren } from "react";
import { authWithExampleId, setExampleId } from "../example";

export function Providers({ children }: PropsWithChildren) {
  return (
    <LiveblocksProvider
      authEndpoint={authWithExampleId("/api/liveblocks-auth")}
      // Get users' info from their ID
      resolveUsers={async ({ userIds }) => {
        const searchParams = new URLSearchParams(
          userIds.map((userId) => ["userIds", userId])
        );
        const response = await fetch(`/api/users?${searchParams}`);

        if (!response.ok) {
          throw new Error("Problem resolving users");
        }

        const users = await response.json();
        return users;
      }}
      // Get rooms' info from their ID
      resolveRoomsInfo={async ({ roomIds }) => {
        const searchParams = new URLSearchParams(
          roomIds.map((roomId) => ["roomIds", roomId])
        );
        const response = await fetch(`/api/rooms?${searchParams}`);

        if (!response.ok) {
          throw new Error("Problem resolving rooms info");
        }

        const roomsInfo = await response.json();
        return roomsInfo;
      }}
      // Find a list of users that match the current search term
      resolveMentionSuggestions={async ({ text }) => {
        const response = await fetch(
          setExampleId(`/api/users/search?text=${encodeURIComponent(text)}`)
        );

        if (!response.ok) {
          throw new Error("Problem resolving mention suggestions");
        }

        const userIds = await response.json();
        return userIds;
      }}
    >
      {children}
    </LiveblocksProvider>
  );
}
