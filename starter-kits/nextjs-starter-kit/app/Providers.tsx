"use client";

import { LiveblocksProvider } from "@liveblocks/react/suspense";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import Router from "next/router";
import { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { DOCUMENT_URL } from "@/constants";
import { authorizeLiveblocks, getSpecificDocuments } from "@/lib/actions";
import { getUsers, getGroups } from "@/lib/database";

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
        // Resolve group IDs into name/avatar/etc for Comments
        resolveGroupsInfo={async ({ groupIds }) => {
          const groups = await getGroups({ groupIds });
          return groups.map((group) => group ?? undefined);
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
        // Resolve what mentions are suggested for Comments/Text Editor
        resolveMentionSuggestions={async ({ text }) => {
          // Get group suggestions
          const groups = await getGroups({ search: text });
          const groupSuggestions = groups
            .filter((group) => group !== null)
            .map((group) => ({
              kind: "group" as const,
              id: group?.id,
            }));

          // Get user suggestions
          const users = await getUsers({ search: text });
          const userSuggestions = users
            .filter((user) => user !== null)
            .map((user) => ({
              kind: "user" as const,
              id: user?.id,
            }));

          // Return combined suggestions
          return [...groupSuggestions, ...userSuggestions];
        }}
      >
        <TooltipProvider>{children}</TooltipProvider>
      </LiveblocksProvider>
    </SessionProvider>
  );
}
