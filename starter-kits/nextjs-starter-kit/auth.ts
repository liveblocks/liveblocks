import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { getCurrentOrganization, switchOrganization } from "@/lib/actions";
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
