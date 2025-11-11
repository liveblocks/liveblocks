"use client";

import { MentionData } from "@liveblocks/client";
import { LiveblocksProvider } from "@liveblocks/react/suspense";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import Router from "next/router";
import { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { ReactNode, useEffect } from "react";
import { DOCUMENT_URL } from "@/constants";
import {
  authorizeLiveblocks,
  getLiveUsers,
  getSpecificDocuments,
} from "@/lib/actions";
import { syncLiveblocksGroups } from "@/lib/actions/syncLiveblocksGroups";
import { getGroups, getUsers } from "@/lib/database";

const SYNC_LIVEBLOCKS_GROUPS_KEY = "sync-liveblocks-groups";
const SYNC_LIVEBLOCKS_GROUPS_VALUE = "1";

export function Providers({
  children,
  session,
}: {
  children: ReactNode;
  session: Session | null;
}) {
  // Sync the starter kit's groups with Liveblocks once per
  // session and only during development
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    if (
      sessionStorage.getItem(SYNC_LIVEBLOCKS_GROUPS_KEY) ===
      SYNC_LIVEBLOCKS_GROUPS_VALUE
    ) {
      return;
    }

    sessionStorage.setItem(
      SYNC_LIVEBLOCKS_GROUPS_KEY,
      SYNC_LIVEBLOCKS_GROUPS_VALUE
    );

    syncLiveblocksGroups().catch(() => {
      sessionStorage.removeItem(SYNC_LIVEBLOCKS_GROUPS_KEY);
    });
  }, []);

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
        resolveMentionSuggestions={async ({ text, roomId }) => {
          const [allUsers, liveUsers, matchingGroups, matchingUsers] =
            await Promise.all([
              getUsers(), // All users
              getLiveUsers({ documentIds: [roomId] }), // All users currently online in the document
              getGroups({ search: text }), // Groups that match the search term
              getUsers({ search: text }), // Users that match the search term
            ]);

          const globalSuggestions: MentionData[] = [];

          // Add `@everyone` suggestion, all users in app
          if ("everyone".includes(text.toLowerCase())) {
            globalSuggestions.push({
              kind: "group",
              id: "everyone",
              userIds: allUsers
                .filter((user) => user !== null)
                .map((user) => user.id),
            });
          }

          // Add `@here` suggestion, all users currently connected to the document
          if (liveUsers.data && "here".includes(text.toLowerCase())) {
            globalSuggestions.push({
              kind: "group",
              id: "here",
              userIds: liveUsers.data[0].users
                .map((user) => user.id)
                .filter((id) => id !== null),
            });
          }

          // Create group suggestions, e.g. `@engineering`
          const groupSuggestions: MentionData[] = matchingGroups
            .filter((group) => group !== null)
            .map((group) => ({
              kind: "group",
              id: group.id,
            }));

          // Create user suggestions, e.g. `anjali.wanda@example.com`
          const userSuggestions: MentionData[] = matchingUsers
            .filter((user) => user !== null)
            .map((user) => ({
              kind: "user",
              id: user.id,
            }));

          // Return combined suggestions
          return [
            ...globalSuggestions,
            ...groupSuggestions,
            ...userSuggestions,
          ];
        }}
      >
        <TooltipProvider>{children}</TooltipProvider>
      </LiveblocksProvider>
    </SessionProvider>
  );
}
