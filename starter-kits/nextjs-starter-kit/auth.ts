import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { getOrganizationIdFromCookie } from "@/lib/actions/switchOrganization";
import { getUser } from "@/lib/database/getUser";

// Your NextAuth secret (generate a new one for production)
// More info: https://next-auth.js.org/configuration/options#secret
// `create-liveblocks-app` generates a value for you, but there's a
// fallback value in case you don't use the installer.
export const NEXTAUTH_SECRET =
  process.env.NEXTAUTH_SECRET || "p49RDzU36fidumaF7imGnzyhRSPWoffNjDOleU77SM4=";

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

      // TODO IMPORTANT sort out this mess

      // Get current organization from cookie (set by switchOrganization action)
      // Fallback to token, then default to first organization if user has organizations
      const organizationFromCookie = await getOrganizationIdFromCookie();
      if (organizationFromCookie) {
        // Verify user has access to this organization
        // Users always have access to their personal organization (their own ID)
        const userOrganizationIds = userInfo.organizationIds || [];
        const isPersonalOrg = organizationFromCookie === userInfo.id;

        if (
          isPersonalOrg ||
          userOrganizationIds.includes(organizationFromCookie)
        ) {
          session.user.currentOrganizationId = organizationFromCookie;
        } else {
          // Personal workspace is always the default
          session.user.currentOrganizationId = userInfo.id;
        }
      } else if (token.organizationId) {
        // Verify token organization is valid
        const userOrganizationIds = userInfo.organizationIds || [];
        const isPersonalOrg = token.organizationId === userInfo.id;
        if (
          isPersonalOrg ||
          userOrganizationIds.includes(token.organizationId)
        ) {
          session.user.currentOrganizationId = token.organizationId;
        } else {
          // Personal workspace is always the default
          session.user.currentOrganizationId = userInfo.id;
        }
      } else {
        // Personal workspace is always the default
        session.user.currentOrganizationId = userInfo.id;
      }

      return session;
    },
    async jwt({ token, user }) {
      // On sign in, get user info and set the default organization
      if (user && user.email) {
        const userInfo = await getUser(user.email);
        if (userInfo) {
          // Check cookie first, otherwise use first organization or personal
          const organizationFromCookie = await getOrganizationIdFromCookie();
          const userOrganizationIds = userInfo.organizationIds || [];
          const isPersonalOrg = organizationFromCookie === userInfo.id;

          if (
            organizationFromCookie &&
            (isPersonalOrg ||
              userOrganizationIds.includes(organizationFromCookie))
          ) {
            token.organizationId = organizationFromCookie;
          } else {
            // Personal workspace is always the default
            token.organizationId = userInfo.id;
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
