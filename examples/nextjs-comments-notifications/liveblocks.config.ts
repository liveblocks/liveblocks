"use client";

import { createClient } from "@liveblocks/client";
import { createLiveblocksContext } from "@liveblocks/react";
import { createRoomContext } from "@liveblocks/react";
import { getDocumentFromRoomId } from "./src/utils/ids";

export const client = createClient({
  authEndpoint: "/api/liveblocks-auth",

  // Get users' info from their ID
  resolveUsers: async ({ userIds }) => {
    const searchParams = new URLSearchParams(
      userIds.map((userId) => ["userIds", userId])
    );

    try {
      const response = await fetch(`/api/users?${searchParams}`);

      return response.json();
    } catch (error) {
      console.error(123, error);
    }
  },

  // Find a list of users that match the current search term
  resolveMentionSuggestions: async ({ text }) => {
    const searchParams = new URLSearchParams({ text });

    try {
      const response = await fetch(`/api/users/search?${searchParams}`);

      return response.json();
    } catch (error) {
      console.error(456, error);

      return [];
    }
  },

  // Get the URL for a thread
  resolveUrls: ({ resources }) => {
    return resources.map((resource) => {
      if (resource.type === "thread") {
        const document = getDocumentFromRoomId(resource.roomId);

        return document ? `/${document}#${resource.threadId}` : undefined;
      } else {
        return;
      }
    });
  },
});

const {
  suspense: { RoomProvider, useThreads },
} = createRoomContext(client);

const {
  suspense: {
    LiveblocksProvider,
    useInboxNotifications,
    useUnreadInboxNotificationsCount,
  },
} = createLiveblocksContext(client);

export {
  RoomProvider,
  LiveblocksProvider,
  useThreads,
  useInboxNotifications,
  useUnreadInboxNotificationsCount,
};
