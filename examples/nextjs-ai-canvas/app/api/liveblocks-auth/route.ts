import { getSession } from "@/example";
import { getLiveblocks } from "@/lib/liveblocksServer";

/**
 * Authenticating your Liveblocks application
 * https://liveblocks.io/docs/authentication
 */
export async function POST(request: Request) {
  const { user, room, access } = await getSession(request);
  const liveblocks = getLiveblocks();

  const session = liveblocks.prepareSession(user.id, {
    userInfo: user.info,
  });

  if (room) {
    if (access === "read") {
      session.allow(room, session.READ_ACCESS);
    } else {
      session.allow(room, session.FULL_ACCESS);
    }
  } else {
    session.allow("liveblocks:examples:nextjs-ai-canvas:*", session.FULL_ACCESS);
  }

  const { body, status } = await session.authorize();
  return new Response(body, { status });
}
