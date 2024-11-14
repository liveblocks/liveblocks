"use client";

import { LiveblocksProvider } from "@liveblocks/react/suspense";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import Router from "next/router";
import { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { DOCUMENT_URL } from "@/constants";
import { authorizeLiveblocks, getSpecificDocuments } from "@/lib/actions";
import { getUsers } from "@/lib/database";

export function Providers({
  children,
  session,
}: {
  children: ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <LiveblocksProvider
        // Using a custom callback that calls our API
        // In this API we'll assign each user custom data, such as names, avatars
        // If any client side data is needed to get user info from your system,
        // (e.g. auth token, user id) send it in the body alongside `room`.
        // This is using a Next.js server action called `authorizeLiveblocks`
        authEndpoint={async () => {
          const { data, error } = await authorizeLiveblocks();

          if (error) {
            Router.push({
              query: {
                ...Router.query,
                error: encodeURIComponent(JSON.stringify(error)),
              },
            });
            return;
          }

          return data;
        }}
        // Update at 60FPS (every 16ms)
        throttle={16}
        // Resolve user IDs into name/avatar/etc for Comments/Notifications
        resolveUsers={async ({ userIds }) => {
          const users = await getUsers({ userIds });
          return users.map((user) => user ?? undefined);
        }}
        // Resolve a mention suggestion into a userId e.g. `@tat` → `tatum.paolo@example.com`
        resolveMentionSuggestions={async ({ text }) => {
          const users = await getUsers({ search: text });
          return users.map((user) => user?.id || "");
        }}
        // Resolve a room ID into room information for Notifications
        resolveRoomsInfo={async ({ roomIds }) => {
          const documents = await getSpecificDocuments({
            documentIds: roomIds,
          });
          return documents.map((document) => ({
            name: document ? document.name : undefined,
            url: document
              ? DOCUMENT_URL(document.type, document.id)
              : undefined,
          }));
        }}
      >
        <TooltipProvider>{children}</TooltipProvider>
      </LiveblocksProvider>
    </SessionProvider>
  );
}
