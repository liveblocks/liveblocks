import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import * as z from "zod";
import { AI_USER_ID, getUser } from "@/lib/database";

const DEMO_ACCOUNT_CREATED_AT = new Date("2024-01-01T00:00:00.000Z");

export function getDemoUser(userId: unknown) {
  if (typeof userId !== "string" || userId === AI_USER_ID) {
    return undefined;
  }
  return getUser(userId);
}

export function toAuthUser(user: Liveblocks["UserMeta"]) {
  return {
    id: user.id,
    email: user.id,
    emailVerified: true,
    name: user.info.name,
    image: user.info.avatar,
    createdAt: DEMO_ACCOUNT_CREATED_AT,
    updatedAt: DEMO_ACCOUNT_CREATED_AT,
  };
}

export function getPreviewUser(body: unknown) {
  if (typeof body !== "object" || body === null || !("previewUserId" in body)) {
    return undefined;
  }
  return getDemoUser(body.previewUserId);
}

export function demoLogin() {
  return {
    id: "demo-login",
    endpoints: {
      signInDemo: createAuthEndpoint(
        "/sign-in/demo",
        {
          method: "POST",
          body: z.object({ userId: z.string() }),
        },
        async (ctx) => {
          const user = getDemoUser(ctx.body.userId);
          if (!user) {
            throw new APIError("BAD_REQUEST", {
              message: "Unknown demo user",
            });
          }

          const authUser = toAuthUser(user);
          const session = await ctx.context.internalAdapter.createSession(
            authUser.id
          );
          await setSessionCookie(ctx, { session, user: authUser });
          return ctx.json({ user: authUser });
        }
      ),
    },
  } satisfies BetterAuthPlugin;
}
