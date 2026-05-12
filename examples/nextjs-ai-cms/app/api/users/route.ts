import { getUser } from "../../database";
import { NextRequest } from "next/server";
import { AI_CMS_USER_ID } from "../../config";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userIds = searchParams.getAll("userIds");

  if (!userIds || userIds.length === 0) {
    return new Response("Missing `userIds` query parameter", { status: 400 });
  }

  const users = userIds.map((id) => {
    const u = getUser(id);
    if (u) {
      return u;
    }
    if (id === AI_CMS_USER_ID) {
      return {
        id,
        info: {
          name: "AI Assistant",
          avatar: "https://liveblocks.io/avatars/avatar-8.png",
          color: "#6366f1",
        },
      } satisfies Liveblocks["UserMeta"];
    }
    return null;
  });

  return Response.json(users);
}
