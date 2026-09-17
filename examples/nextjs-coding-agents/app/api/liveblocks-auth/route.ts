import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserColor } from "@/lib/agent-user";
import { getLiveblocks } from "@/lib/server/liveblocks";

/**
 * Authenticating your Liveblocks application
 * https://liveblocks.io/docs/authentication
 *
 * The Liveblocks user is the signed-in GitHub user. Team members get write
 * access to the shared room; anyone else who can sign in gets read access,
 * so they can watch chats in realtime without being able to post.
 */
export async function POST() {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Not signed in", { status: 401 });
  }

  const { user } = session;
  const liveblocksSession = getLiveblocks().prepareSession(user.login, {
    userInfo: {
      name: user.name ?? user.login,
      avatar: user.image ?? `https://github.com/${user.login}.png?size=128`,
      color: getUserColor(user.login),
    },
  });

  // Use a naming pattern to allow access to rooms with a wildcard
  liveblocksSession.allow(
    "liveblocks:examples:*",
    user.role === "member"
      ? liveblocksSession.FULL_ACCESS
      : liveblocksSession.READ_ACCESS
  );

  const { status, body } = await liveblocksSession.authorize();
  return new NextResponse(body, { status });
}
