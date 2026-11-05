import { NextRequest, NextResponse } from "next/server";
import { getDirectoryRoomId } from "@/lib/example";
import {
  getLessonRoom,
  liveblocks,
  upsertProfile,
} from "@/lib/liveblocks-server";
import { getExampleId, getRequestUser } from "@/lib/request-user";

// Authenticates the current user with Liveblocks. Access is only granted to
// lesson rooms the user is a member of (see `usersAccesses`), which is what
// makes invite links meaningful.
export async function POST(request: NextRequest) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const user = await getRequestUser(request);
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const exampleId = getExampleId(request);
  const body = (await request.json().catch(() => ({}))) as { room?: string };
  const roomId = body.room;

  const session = liveblocks.prepareSession(user.id, { userInfo: user.info });

  if (roomId) {
    if (roomId === getDirectoryRoomId(exampleId)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    const room = await getLessonRoom(roomId, user.id);
    if (!room) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    // The room, its Comments threads, and the chat feed sharing its id
    session.allow(roomId, session.FULL_ACCESS);
  }

  // Make Google users resolvable by everyone else (avatars, mentions)
  await upsertProfile(user, exampleId);

  const { status, body: token } = await session.authorize();
  return new NextResponse(token, { status });
}
