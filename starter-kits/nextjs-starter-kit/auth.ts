import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { getUser } from "@/lib/database/getUser";

// Your NextAuth secret (generate a new one for production)
// More info: https://next-auth.js.org/configuration/options#secret
export const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  secret: NEXTAUTH_SECRET || "p49RDzU36fidumaF7imGnzyhRSPWoffNjDOleU77SM4=",
  callbacks: {
    // Get extra user info from your database to pass to front-end
    // For front end, update next-auth.d.ts with session type
    async session({ session }: { session: any }) {
      const userInfo = await getUser(session.user.email);

      if (!userInfo) {
        throw new Error("User not found");
      }

      session.user.info = userInfo;
      return session;
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
