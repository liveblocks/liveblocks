import { createClient } from "@liveblocks/client";

export const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
  // @ts-expect-error - Hidden config option
  baseUrl: process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL,

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

  // Find a list of users that match the current search term
  resolveMentionSuggestions: async ({ text }) => {
    const response = await fetch(
      `/api/users/search?text=${encodeURIComponent(text)}`
    );

    if (!response.ok) {
      throw new Error("Problem resolving mention suggestions");
    }

    const userIds = await response.json();
    return userIds;
  },
});

declare global {
  interface Liveblocks {
    UserMeta: {
      id: string;
      info: {
        name: string;
        picture: string;
        color: string;
      };
    };
  }
}
