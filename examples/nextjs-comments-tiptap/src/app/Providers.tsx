"use client";

import { LiveblocksProvider } from "@liveblocks/react";
import { PropsWithChildren } from "react";
import { useScenario } from "@/hooks/useScenario";

export function Providers({ children }: PropsWithChildren) {
  const { scenario, isLoaded } = useScenario();

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  const isAnonymous = scenario === "anonymous";

  const liveblocksProps = isAnonymous
    ? { publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY as string }
    : { authEndpoint: "/api/liveblocks-auth" };

  return (
    <LiveblocksProvider
      {...liveblocksProps}
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
      {children}
    </LiveblocksProvider>
  );
}
