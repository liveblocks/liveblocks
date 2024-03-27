"use server";

import { auth } from "@/auth";
import { UserInfo } from "@/liveblocks.config";
import { liveblocks } from "@/liveblocks.server.config";
import { GetLiveUsersProps, LiveUsersResponse } from "@/types";

/**
 * Get Live Users
 *
 * Get the online users in the documents passed
 * Uses custom API endpoint
 *
 * @param documentIds - An array of document ids
 */
export async function getLiveUsers({ documentIds }: GetLiveUsersProps) {
  const promises: ReturnType<typeof liveblocks.getActiveUsers<UserInfo>>[] = [];

  for (const roomId of documentIds) {
    promises.push(liveblocks.getActiveUsers<UserInfo>(roomId));
  }

  let session;
  let currentActiveUsers = [];
  try {
    // Get session and rooms
    const [sess, ...roomUsers] = await Promise.all([auth(), ...promises]);
    session = sess;
    currentActiveUsers = roomUsers;
  } catch (err) {
    console.error(err);
    return {
      error: {
        code: 500,
        message: "Error fetching rooms",
        suggestion: "Refresh the page and try again",
      },
    };
  }

  // Check user is logged in
  if (!session) {
    return {
      error: {
        code: 401,
        message: "Not signed in",
        suggestion: "Sign in to access active users",
      },
    };
  }

  const result: LiveUsersResponse[] = [];
  // Add active user info to list ready to return
  for (const [i, roomId] of documentIds.entries()) {
    const { data } = currentActiveUsers[i];
    const users = data ?? [];

    result.push({
      documentId: roomId,
      users: users,
    });
  }

  return { data: result };
}
