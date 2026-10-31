import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { getRoomScope, isExampleRoomId } from "@/lib/example";
import { isLanguageCode } from "@/lib/languages";
import {
  createRoomId,
  INVITE_TOKEN_KEY,
  isRoomMember,
  liveblocks,
  toLessonRooms,
} from "@/lib/liveblocks-server";
import { getExampleId, getRequestUser } from "@/lib/request-user";

// Lists the lesson rooms the current user is a member of
export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const exampleId = getExampleId(request);
  const { data } = await liveblocks.getRooms({
    userId: user.id,
    query: { roomId: { startsWith: `${getRoomScope(exampleId)}:` } },
    limit: 50,
  });

  // `userId` already narrows the query; re-check membership here so the
  // list can never leak a room the user was removed from.
  const rooms = await toLessonRooms(
    data
      .filter((room) => isExampleRoomId(room.id) && isRoomMember(room, user.id))
      .sort(
        (a, b) =>
          (b.lastConnectionAt ?? b.createdAt).getTime() -
          (a.lastConnectionAt ?? a.createdAt).getTime()
      ),
    exampleId
  );
  return NextResponse.json(rooms);
}

// Creates a lesson room. The creator becomes its tutor and only member;
// students join through the invite link.
export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: unknown;
    language?: unknown;
  };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 80) {
    return new NextResponse("Invalid room name", { status: 400 });
  }
  const language = isLanguageCode(body.language) ? body.language : "en";

  const exampleId = getExampleId(request);
  const room = await liveblocks.createRoom(createRoomId(exampleId), {
    defaultAccesses: [],
    usersAccesses: { [user.id]: ["room:write"] },
    metadata: {
      name,
      language,
      ownerId: user.id,
      [INVITE_TOKEN_KEY]: nanoid(24),
    },
  });

  const [lessonRoom] = await toLessonRooms([room], exampleId);
  return NextResponse.json(lessonRoom, { status: 201 });
}
