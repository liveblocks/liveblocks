import { LiveblocksError } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { isExampleRoomId } from "@/lib/example";
import {
  INVITE_TOKEN_KEY,
  isRoomMember,
  liveblocks,
  toLessonRooms,
} from "@/lib/liveblocks-server";
import { getExampleId, getRequestUser } from "@/lib/request-user";

type Context = { params: Promise<{ roomId: string }> };

// Joins a room through its invite link. The token in the link must match the
// one stored in the room's metadata; on success the user is added to the
// room's `usersAccesses`, which is what `/api/liveblocks-auth` checks.
export async function POST(request: NextRequest, { params }: Context) {
  const user = await getRequestUser(request);
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { roomId } = await params;
  if (!isExampleRoomId(roomId)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as { token?: unknown };
  const token = typeof body.token === "string" ? body.token : "";

  let room;
  try {
    room = await liveblocks.getRoom(roomId);
  } catch (error) {
    if (error instanceof LiveblocksError && error.status === 404) {
      return new NextResponse("This room no longer exists", { status: 404 });
    }
    throw error;
  }

  const exampleId = getExampleId(request);
  if (isRoomMember(room, user.id)) {
    const [lessonRoom] = await toLessonRooms([room], exampleId);
    return NextResponse.json(lessonRoom);
  }

  if (!token || room.metadata[INVITE_TOKEN_KEY] !== token) {
    return new NextResponse("This invite link is not valid", { status: 403 });
  }

  const updated = await liveblocks.updateRoom(roomId, {
    usersAccesses: { [user.id]: ["room:write"] },
  });
  const [lessonRoom] = await toLessonRooms([updated], exampleId);
  return NextResponse.json(lessonRoom);
}
