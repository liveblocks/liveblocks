"use server";

import { auth } from "@/auth";
import { ANONYMOUS_USER_ID } from "@/constants";
import { liveblocks } from "@/liveblocks.server.config";
import { User } from "@/types";

export async function authorizeLiveblocks(
  /* `undefined` means this call is for a project-level feature, e.g. Notifications */
  roomId: string | undefined
) {
  // Get current session from NextAuth
  const [session, room] = await Promise.all([
    auth(),
    roomId ? liveblocks.getRoom(roomId) : null,
  ]);

  // Anonymous user info
  const anonymousUser: User = {
    id: ANONYMOUS_USER_ID,
    name: "Anonymous",
    color: "#ff0000",
    avatar: "",
    organizationIds: [],
  };

  // Get current user info from session (defined in /auth.config.ts)
  // If no session found, this is a logged out/anonymous user
  const { name, avatar, color, id } = session?.user.info ?? anonymousUser;

  // Get current organization from session
  const currentOrganizationId = session?.user.currentOrganizationId;

  // Get Liveblocks ID token
  const { status, body } = await liveblocks.identifyUser(
    {
      userId: id,

      // Permissions in this app use groupIds to determine access to rooms
      // so we pass the current organizationId if it exists
      groupIds: currentOrganizationId ? [currentOrganizationId] : [],

      // Always pass the organizationId for the current room, otherwise
      // anonymous users will not be able to join
      organizationId: room?.organizationId ?? undefined,
    },
    {
      userInfo: { name, color, avatar },
    }
  );

  if (status !== 200) {
    return {
      error: {
        code: 401,
        message: "No access",
        suggestion: "You don't have access to this Liveblocks room",
      },
    };
  }

  if (!body) {
    return {
      error: {
        code: 404,
        message: "ID token issue",
        suggestion: "Contact an administrator",
      },
    };
  }

  return { data: JSON.parse(body) };
}
