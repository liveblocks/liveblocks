import { cookies } from "next/headers";
import { getRandomUser, getUser } from "./database";

const USER_COOKIE_KEY = "liveblocks-ai-canvas-user";

export type AuthAccessMode = "read" | "write";

type SessionPayload = {
  room?: string;
  userId?: string;
  access?: AuthAccessMode;
};

export async function getSession(request: Request) {
  const body = (await request.json().catch(() => ({}))) as SessionPayload;
  const cookieStore = await cookies();
  const cookieUserId = cookieStore.get(USER_COOKIE_KEY)?.value;
  const pickedUserId = body.userId ?? cookieUserId;
  const user = pickedUserId ? getUser(pickedUserId) : getRandomUser();

  if (!user) {
    throw new Error("User not found");
  }

  if (!cookieUserId || cookieUserId !== user.id) {
    cookieStore.set(USER_COOKIE_KEY, user.id, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return {
    room: body.room ?? "",
    user,
    access: body.access ?? "write",
  };
}
