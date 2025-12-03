import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { getWorkspaceIdFromCookie } from "@/lib/actions/switchWorkspace";
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

      // Get current workspace from cookie (set by switchWorkspace action)
      // Fallback to token, then default to first workspace if user has workspaces
      const workspaceFromCookie = await getWorkspaceIdFromCookie();
      if (workspaceFromCookie) {
        // Verify user has access to this workspace
        const userWorkspaceIds = userInfo.workspaceIds || [];
        if (userWorkspaceIds.includes(workspaceFromCookie)) {
          session.user.currentWorkspaceId = workspaceFromCookie;
        } else if (userWorkspaceIds.length > 0) {
          session.user.currentWorkspaceId = userWorkspaceIds[0];
        }
      } else if (token.workspaceId) {
        session.user.currentWorkspaceId = token.workspaceId;
      } else if (userInfo.workspaceIds && userInfo.workspaceIds.length > 0) {
        session.user.currentWorkspaceId = userInfo.workspaceIds[0];
      }

      return session;
    },
    async jwt({ token, user }) {
      // On sign in, get user info and set the default workspace
      if (user && user.email) {
        const userInfo = await getUser(user.email);
        if (userInfo?.workspaceIds && userInfo.workspaceIds.length > 0) {
          // Check cookie first, otherwise use first workspace
          const workspaceFromCookie = await getWorkspaceIdFromCookie();
          if (
            workspaceFromCookie &&
            userInfo.workspaceIds.includes(workspaceFromCookie)
          ) {
            token.workspaceId = workspaceFromCookie;
          } else {
            token.workspaceId = userInfo.workspaceIds[0];
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
