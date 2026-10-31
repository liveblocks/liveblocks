import { NextRequest, NextResponse } from "next/server";
import { getLessonRoom, liveblocks } from "@/lib/liveblocks-server";
import { getRequestUser } from "@/lib/request-user";

type Context = { params: Promise<{ roomId: string; fileId: string }> };

// Liveblocks file URLs point to object storage, which does not allow browser
// requests from localhost. Download server-side and return the bytes from our
// own origin after checking the requester is a room member.
export async function GET(request: NextRequest, { params }: Context) {
  const user = await getRequestUser(request);
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { roomId, fileId } = await params;
  const room = await getLessonRoom(roomId, user.id);
  if (!room) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { url } = await liveblocks.getFileUrl({ roomId, file: fileId });
  const file = await fetch(url);
  if (!file.ok || !file.body) {
    return new NextResponse("Could not download file", { status: 502 });
  }

  const headers = new Headers({
    "Content-Type": file.headers.get("Content-Type") ?? "application/pdf",
    "Cache-Control": "private, max-age=300",
  });
  const length = file.headers.get("Content-Length");
  if (length) headers.set("Content-Length", length);

  return new NextResponse(file.body, { headers });
}
