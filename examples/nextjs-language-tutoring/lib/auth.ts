import { betterAuth } from "better-auth";
import { toNextJsHandler } from "better-auth/next-js";
import { getColorForUserId, getUser } from "@/app/database";
import { demoLogin } from "./demo-login";

const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

// Google sign-in is enabled when both env vars are present. Without them the
// app only offers the demo accounts from `app/database.ts`.
export const GOOGLE_ENABLED = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

// There's no database: sessions (and the Google account) live in an encrypted
// cookie. This keeps the example deployable with only a Liveblocks key. The
// Liveblocks secret doubles as the cookie secret when BETTER_AUTH_SECRET isn't set.
export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET ?? process.env.LIVEBLOCKS_SECRET_KEY,
  session: {
    expiresIn: SESSION_MAX_AGE,
    cookieCache: {
      enabled: true,
      maxAge: SESSION_MAX_AGE,
      strategy: "jwe",
      refreshCache: true,
    },
  },
  account: {
    storeStateStrategy: "cookie",
    storeAccountCookie: true,
  },
  socialProviders: GOOGLE_ENABLED
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
      }
    : undefined,
  plugins: [demoLogin()],
});

export const authHandlers = toNextJsHandler(auth);

export type SessionUser = Liveblocks["UserMeta"] & {
  // True for Google accounts, false for demo accounts
  external: boolean;
};

// The signed-in user, as Liveblocks sees them. Users are identified by their
// email address: demo users already use it as their id, and for Google users
// it's the only identifier that stays stable without a database.
export async function getSessionUser(
  headers: Headers
): Promise<SessionUser | undefined> {
  const session = await auth.api.getSession({ headers });
  if (!session) {
    return undefined;
  }

  const email = session.user.email.toLowerCase();
  const demoUser = getUser(email);
  if (demoUser) {
    return { ...demoUser, external: false };
  }

  if (!session.user.emailVerified) {
    return undefined;
  }

  return {
    id: email,
    external: true,
    info: {
      name: session.user.name || email,
      avatar:
        session.user.image ||
        `https://liveblocks.io/api/avatar?u=${encodeURIComponent(email)}`,
      color: getColorForUserId(email),
    },
  };
}
