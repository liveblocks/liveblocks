import { NextRequest, NextResponse } from "next/server";
import {
  getLessonRoom,
  getRoomInfo,
  INVITE_TOKEN_KEY,
  liveblocks,
  toLessonRooms,
} from "@/lib/liveblocks-server";
import { getExampleId, getRequestUser } from "@/lib/request-user";

type Context = { params: Promise<{ roomId: string }> };

// Details of one lesson room, for members only. The invite token is only
// returned to the tutor, who is the one sharing the link.
export async function GET(request: NextRequest, { params }: Context) {
  const user = await getRequestUser(request);
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { roomId } = await params;
  const room = await getLessonRoom(roomId, user.id);
  if (!room) {
    return new NextResponse("Not found", { status: 404 });
  }

  const [lessonRoom] = await toLessonRooms([room], getExampleId(request));
  const isTutor = getRoomInfo(room).ownerId === user.id;
  const inviteToken = room.metadata[INVITE_TOKEN_KEY];

  return NextResponse.json({
    ...lessonRoom,
    inviteToken:
      isTutor && typeof inviteToken === "string" ? inviteToken : null,
  });
}

// Deletes the room and everything in it (tutor only)
export async function DELETE(request: NextRequest, { params }: Context) {
  const user = await getRequestUser(request);
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { roomId } = await params;
  const room = await getLessonRoom(roomId, user.id);
  if (!room) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (getRoomInfo(room).ownerId !== user.id) {
    return new NextResponse("Only the tutor can delete the room", {
      status: 403,
    });
  }

  await liveblocks.deleteRoom(roomId);
  return new NextResponse(null, { status: 204 });
}
