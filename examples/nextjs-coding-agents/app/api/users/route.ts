import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { AI_USER, AI_USER_ID, getUserColor } from "@/lib/agent-user";
import { getGitHubUsers } from "@/lib/server/github";

/**
 * Returns user info from user IDs (GitHub logins).
 * For `resolveUsers` in LiveblocksProvider.
 */
export async function GET(request: NextRequest) {
  if (!(await auth())) {
    return new NextResponse("Not signed in", { status: 401 });
  }

  const userIds = new URL(request.url).searchParams.getAll("userIds");
  if (userIds.length === 0) {
    return new NextResponse("Missing userIds", { status: 400 });
  }

  const users = await getGitHubUsers(
    userIds.filter((userId) => userId !== AI_USER_ID)
  );

  return NextResponse.json(
    userIds.map((userId): Liveblocks["UserMeta"]["info"] | null => {
      if (userId === AI_USER_ID) {
        return AI_USER.info;
      }
      const user = users.get(userId);
      return user
        ? { name: user.name, avatar: user.avatar, color: getUserColor(userId) }
        : null;
    })
  );
}
