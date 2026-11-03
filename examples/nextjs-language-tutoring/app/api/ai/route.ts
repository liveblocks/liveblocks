import { NextRequest, NextResponse } from "next/server";
import { runAssistant, type AssistantRequest } from "@/lib/ai/assistant";
import {
  getLessonRoom,
  getRoomInfo,
  toLessonRooms,
} from "@/lib/liveblocks-server";
import { getExampleId, getRequestUser } from "@/lib/request-user";

// Editing documents and streaming the reply can take a while
export const maxDuration = 60;

type Body = {
  roomId: string;
  activeDocId: string | null;
  history: { userId: string; content: string }[];
};

// Called by the chat when a message mentions @ai. The assistant replies in
// the room's chat feed and edits documents through the Liveblocks REST API,
// so this request only resolves once it's done; the client doesn't wait.
export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = parseBody(await request.json());
  if (!body) {
    return new NextResponse("Invalid request", { status: 400 });
  }

  const room = await getLessonRoom(body.roomId, user.id);
  if (!room) {
    return new NextResponse("Not found", { status: 404 });
  }

  const [lessonRoom] = await toLessonRooms([room], getExampleId(request));
  const names = new Map(
    lessonRoom.members.map((member) => [
      member.id,
      member.info?.name ?? member.id,
    ])
  );

  const assistantRequest: AssistantRequest = {
    roomId: room.id,
    language: getRoomInfo(room).language,
    activeDocId: body.activeDocId,
    history: body.history.map((message) => ({
      ...message,
      name: names.get(message.userId) ?? message.userId,
    })),
    members: lessonRoom.members.map((member) => ({
      id: member.id,
      name: names.get(member.id) ?? member.id,
      role: member.role,
    })),
  };

  await runAssistant(assistantRequest);
  return NextResponse.json({ ok: true });
}

function parseBody(value: unknown): Body | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const { roomId, activeDocId, history } = value as Record<string, unknown>;
  if (typeof roomId !== "string" || !Array.isArray(history)) return undefined;
  const messages: Body["history"] = [];
  for (const entry of history) {
    if (typeof entry !== "object" || entry === null) continue;
    const { userId, content } = entry as Record<string, unknown>;
    if (typeof userId === "string" && typeof content === "string") {
      messages.push({ userId, content });
    }
  }
  if (messages.length === 0) return undefined;
  return {
    roomId,
    activeDocId: typeof activeDocId === "string" ? activeDocId : null,
    history: messages.slice(-12),
  };
}
