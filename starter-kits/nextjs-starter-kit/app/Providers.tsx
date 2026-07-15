"use client";

import { MentionData } from "@liveblocks/client";
import { LiveblocksProvider } from "@liveblocks/react/suspense";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import Router from "next/router";
import { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { DOCUMENT_URL } from "@/constants";
import { AI_USER_ID, aiUser } from "@/data/ai";
import {
  authorizeLiveblocks,
  getAiConfig,
  getLiveUsers,
  getSpecificDocuments,
} from "@/lib/actions";
import { getUsers } from "@/lib/database";
import { Document } from "@/types";

// Cached AI config and document lookups, used to decide whether the AI
// assistant should be suggested in comment @mentions
let aiConfig$: ReturnType<typeof getAiConfig> | null = null;
const documentTypes = new Map<string, Promise<Document["type"] | null>>();

function getCachedAiConfig() {
  if (!aiConfig$) {
    aiConfig$ = getAiConfig();
  }
  return aiConfig$;
}

function getCachedDocumentType(roomId: string) {
  let documentType$ = documentTypes.get(roomId);
  if (!documentType$) {
    documentType$ = getSpecificDocuments({ documentIds: [roomId] }).then(
      (documents) => documents[0]?.type ?? null
    );
    documentTypes.set(roomId, documentType$);
  }
  return documentType$;
}

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
        authEndpoint={async (roomId) => {
          const { data, error } = await authorizeLiveblocks(roomId);

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
          // Not expected in current app, only @here an @everyone added
          if (!groupIds.includes("everyone") || !groupIds.includes("here")) {
            return [];
          }

          return groupIds.map((groupId) => ({
            id: groupId,
            name: groupId.charAt(0).toUpperCase() + groupId.slice(1),
          }));
        }}
        // Resolve what mentions are suggested for Comments/Text Editor
        resolveMentionSuggestions={async ({ text, roomId }) => {
          const [allUsers, liveUsers, matchingUsers] = await Promise.all([
            getUsers(), // All users
            getLiveUsers({ documentIds: [roomId] }), // All users currently online in the document
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

          // Create user suggestions, e.g. `anjali.wanda@example.com`
          const userSuggestions: MentionData[] = matchingUsers
            .filter((user) => user !== null)
            .map((user) => ({
              kind: "user",
              id: user.id,
            }));

          // Suggest the AI assistant in spreadsheet/flowchart comments, so it
          // can be @mentioned for an AI reply. Only when webhooks are set up
          // (`LIVEBLOCKS_WEBHOOK_SECRET_KEY`), which power the replies.
          const aiSuggestions: MentionData[] = [];
          if (
            aiUser.name.toLowerCase().includes(text.toLowerCase()) ||
            AI_USER_ID.includes(text.toLowerCase())
          ) {
            const [{ commentAiEnabled }, documentType] = await Promise.all([
              getCachedAiConfig(),
              getCachedDocumentType(roomId),
            ]);
            if (
              commentAiEnabled &&
              (documentType === "spreadsheet" || documentType === "flowchart")
            ) {
              aiSuggestions.push({ kind: "user", id: AI_USER_ID });
            }
          }

          // Return combined suggestions
          return [...globalSuggestions, ...aiSuggestions, ...userSuggestions];
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
