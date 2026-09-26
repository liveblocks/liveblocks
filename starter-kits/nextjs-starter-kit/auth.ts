import { randomBytes } from "crypto";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { getCurrentOrganization, switchOrganization } from "@/lib/actions";
import { getUser } from "@/lib/database/getUser";

// Your NextAuth secret (generate a new one for production)
// More info: https://next-auth.js.org/configuration/options#secret
// `create-liveblocks-app` generates a value for you.
//
// There is deliberately no hard-coded fallback constant here: this kit signs
// Auth.js JWT session tokens with the secret, so a public constant would be a
// public signing key — anyone could forge a valid session for a known user
// (CWE-798 / CWE-321, #3702).
export const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? (() => {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXTAUTH_SECRET is not set. Generate one with `npx auth secret` " +
        "(or `openssl rand -base64 32`) and add it to your environment before deploying.",
    );
  }
  // Development fallback: an ephemeral per-process secret keeps `next dev`
  // working with no setup. Sessions do not survive a restart, which is fine
  // locally and impossible to forge from outside the machine.
  console.warn(
    "[liveblocks] NEXTAUTH_SECRET is not set — using an ephemeral development secret. " +
      "Sessions will not survive a restart; run `npx auth secret` for a stable value.",
  );
  return randomBytes(32).toString("base64");
})();

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  secret: NEXTAUTH_SECRET,
  callbacks: {
    // Get extra user info from your database to pass to front-end
    // For front end, update next-auth.d.ts with session type
    async session({ session, token }: { session: any; token: any }) {
      const userInfo = await getUser(session.user.email);

      if (!userInfo) {
        throw new Error("User not found");
      }

      session.user.info = userInfo;
      session.user.currentOrganizationId = token.organizationId;

      // On every load, check current org and if user has access
      const currentOrganizationId = await getCurrentOrganization();

      if (currentOrganizationId) {
        if (userInfo.organizationIds.includes(currentOrganizationId)) {
          session.user.currentOrganizationId = currentOrganizationId;
        }
      }

      return session;
    },
    async jwt({ token, user }) {
      // Once on sign in, get user and current org. Set an org if not set already.
      if (user && user.email) {
        const userInfo = await getUser(user.email);

        if (userInfo) {
          const currentOrganizationId = await getCurrentOrganization();

          if (
            currentOrganizationId &&
            userInfo.organizationIds.includes(currentOrganizationId)
          ) {
            token.organizationId = currentOrganizationId;
          } else {
            const firstOrganization = userInfo.organizationIds[0];
            token.organizationId = firstOrganization;
            await switchOrganization(firstOrganization);
          }
        }
      }

      return token;
    },
  },
  pages: {
    signIn: "/signin",
  },

  ...authConfig,
});

export function getProviders() {
  const providers: Record<string, string> = {};

  for (const provider of authConfig.providers) {
    if ("id" in provider) {
      providers[provider.id] = provider.name;
    }
  }

  return providers;
}
