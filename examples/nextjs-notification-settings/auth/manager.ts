import NextAuth from "next-auth";

import { authConfig } from "./config";
import { getUser } from "@/lib/database";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    // Get extra user info from your database to pass to front-end
    // For front end, update next-auth.d.ts with session type
    async session({ session }: { session: any }) {
      const userInfo = getUser(session.user.email);

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
