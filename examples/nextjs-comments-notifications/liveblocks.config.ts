"use client";

import { createClient } from "@liveblocks/client";
import { createLiveblocksContext } from "@liveblocks/react";
import { createRoomContext } from "@liveblocks/react";
import { authWithExampleId, setExampleId } from "./src/example";

export const client = createClient({
  authEndpoint: authWithExampleId("/api/liveblocks-auth"),

  // Get users' info from their ID
  resolveUsers: async ({ userIds }) => {
    const searchParams = new URLSearchParams(
      userIds.map((userId) => ["userIds", userId])
    );
    const response = await fetch(`/api/users?${searchParams}`);

    if (!response.ok) {
      throw new Error("Problem resolving users");
    }

    const users = await response.json();
    return users;
  },

  // Get rooms' info from their ID
  resolveRoomsInfo: async ({ roomIds }) => {
    const searchParams = new URLSearchParams(
      roomIds.map((roomId) => ["roomIds", roomId])
    );
    const response = await fetch(`/api/rooms?${searchParams}`);

    if (!response.ok) {
      throw new Error("Problem resolving rooms info");
    }

    const roomsInfo = await response.json();
    return roomsInfo;
  },

  // Find a list of users that match the current search term
  resolveMentionSuggestions: async ({ text }) => {
    const response = await fetch(
      setExampleId(`/api/users/search?text=${encodeURIComponent(text)}`)
    );

    if (!response.ok) {
      throw new Error("Problem resolving mention suggestions");
    }

    const userIds = await response.json();
    return userIds;
  },
});

// We're reusing this type in multiple places for consistency.
export type User = {
  id: string;
  info: {
    name: string;
    avatar: string;
  };
};

// We're reusing this type in multiple places for consistency.
export type Room = {
  id: string;
  info: {
    slug: string;
    name: string;
    url: string;
  };
};

const {
  suspense: { RoomProvider, useThreads },
} = createRoomContext<{}, {}, User>(client);

const {
  suspense: {
    LiveblocksProvider,
    useUser,
    useRoomInfo,
    useInboxNotifications,
    useUnreadInboxNotificationsCount,
    useMarkAllInboxNotificationsAsRead,
  },
} = createLiveblocksContext<User>(client);

export {
  RoomProvider,
  LiveblocksProvider,
  useUser,
  useThreads,
  useRoomInfo,
  useInboxNotifications,
  useUnreadInboxNotificationsCount,
  useMarkAllInboxNotificationsAsRead,
};
