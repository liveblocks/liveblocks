import { getCookie } from "cookies-next";
import { Session } from "next-auth";
import { unstable_getServerSession as nextAuthGetServerSession } from "next-auth/next";
import { AUTHENTICATION_DEMO_MODE } from "../../../liveblocks.config";
import { User } from "../../../types";
import { getUser } from "../database";

export const getServerSession = AUTHENTICATION_DEMO_MODE
  ? demoGetServerSession
  : nextAuthGetServerSession;

// === EVERYTHING BELOW ONLY NECESSARY FOR DEMO AUTH ===========================

async function demoGetServerSession(
  ...args: Parameters<typeof nextAuthGetServerSession>
): Promise<Session | null> {
  const [req, res] = args;

  const userId = getCookie("demoAuthUser", { req: req as any, res }) as string;

  if (!userId) {
    return null;
  }

  const user: User | null = await getUser(userId);

  if (!user) {
    return null;
  }

  const date = new Date(Date.now());
  date.setDate(date.getDate() + 30);
  const expiryString = date.toISOString();

  const session: Session = {
    user: {
      info: user,
    },
    expires: expiryString,
  };

  return session;
}
