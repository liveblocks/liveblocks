"use client";

import { LiveblocksProvider } from "@liveblocks/react";
import { PropsWithChildren, Suspense } from "react";
import { getRandomUser, getUser } from "@/database";
import {
  getUserType,
  USER_ID_SEARCH_PARAM,
  USER_SEARCH_PARAM,
  type UserType,
} from "@/user";

const USER_ID_STORAGE_KEY = "liveblocks:examples:nextjs-comments-private:user";

async function authEndpoint(room?: string) {
  const searchParams = new URLSearchParams();

  if (typeof window !== "undefined") {
    const userType = getUserType(new URLSearchParams(window.location.search));
    searchParams.set(USER_SEARCH_PARAM, userType);
    searchParams.set(USER_ID_SEARCH_PARAM, getCurrentUserId(userType));
  }

  const queryString = searchParams.toString();
  const response = await fetch(
    `/api/liveblocks-auth${queryString ? `?${queryString}` : ""}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ room }),
    }
  );

  if (!response.ok) {
    throw new Error("Problem authenticating");
  }

  return await response.json();
}

function getCurrentUserId(userType: UserType) {
  const storageKey = `${USER_ID_STORAGE_KEY}:${userType}`;
  const storedUserId = window.localStorage.getItem(storageKey);
  const storedUser = storedUserId ? getUser(storedUserId) : null;

  if (storedUser?.type === userType) {
    return storedUser.id;
  }

  const user = getRandomUser(userType);
  window.localStorage.setItem(storageKey, user.id);
  return user.id;
}

export function Providers({ children }: PropsWithChildren) {
  return (
    <LiveblocksProvider
      authEndpoint={authEndpoint}
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
      // Find a list of users that match the current search term
      resolveMentionSuggestions={async ({ text }) => {
        const response = await fetch(
          `/api/users/search?text=${encodeURIComponent(text)}`
        );

        if (!response.ok) {
          throw new Error("Problem resolving mention suggestions");
        }

        const userIds = await response.json();
        return userIds;
      }}
    >
      <Suspense>{children}</Suspense>
    </LiveblocksProvider>
  );
}
