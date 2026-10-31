"use client";

import { LiveblocksProvider } from "@liveblocks/react/suspense";
import { type PropsWithChildren, useCallback } from "react";
import { AppProvider, useApp } from "@/components/app-context";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({
  googleEnabled,
  children,
}: PropsWithChildren<{ googleEnabled: boolean }>) {
  return (
    <AppProvider googleEnabled={googleEnabled}>
      <TooltipProvider>
        <LiveblocksProviders>{children}</LiveblocksProviders>
      </TooltipProvider>
    </AppProvider>
  );
}

function LiveblocksProviders({ children }: PropsWithChildren) {
  const { api } = useApp();

  // Tokens are scoped to the room being joined; the server only grants
  // access to rooms the current user is a member of.
  const authEndpoint = useCallback(
    (room?: string) =>
      api<{ token: string }>("/api/liveblocks-auth", {
        method: "POST",
        json: { room },
      }),
    [api]
  );

  return (
    <LiveblocksProvider
      throttle={16}
      // Only set when running against the local Liveblocks dev server
      baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
      authEndpoint={authEndpoint}
      // Resolve user info (name, avatar, color) from user ids. Used by
      // avatars, cursors, comments, and the chat.
      resolveUsers={async ({ userIds }) => {
        const search = new URLSearchParams(
          userIds.map((userId) => ["userIds", userId])
        );
        return api(`/api/users?${search}`);
      }}
      // Find a list of users that match the current @mention search term
      resolveMentionSuggestions={async ({ text }) =>
        api(`/api/users/search?text=${encodeURIComponent(text)}`)
      }
    >
      {children}
    </LiveblocksProvider>
  );
}
