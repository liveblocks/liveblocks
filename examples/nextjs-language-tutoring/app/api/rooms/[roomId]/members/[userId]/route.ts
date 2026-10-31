import { NextRequest, NextResponse } from "next/server";
import {
  getLessonRoom,
  getRoomInfo,
  liveblocks,
  toLessonRooms,
} from "@/lib/liveblocks-server";
import { getExampleId, getRequestUser } from "@/lib/request-user";

type Context = { params: Promise<{ roomId: string; userId: string }> };

// Removes a member from the room. The tutor can remove students; students
// can leave by removing themselves. The tutor can't be removed.
export async function DELETE(request: NextRequest, { params }: Context) {
  const user = await getRequestUser(request);
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { roomId, userId: rawUserId } = await params;
  const userId = decodeURIComponent(rawUserId);
  const room = await getLessonRoom(roomId, user.id);
  if (!room) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { ownerId } = getRoomInfo(room);
  if (userId === ownerId) {
    return new NextResponse("The tutor can't leave their own room", {
      status: 400,
    });
  }
  if (user.id !== ownerId && user.id !== userId) {
    return new NextResponse("Only the tutor can remove other members", {
      status: 403,
    });
  }

  const updated = await liveblocks.updateRoom(roomId, {
    usersAccesses: { [userId]: null },
  });
  const [lessonRoom] = await toLessonRooms([updated], getExampleId(request));
  return NextResponse.json(lessonRoom);
}
