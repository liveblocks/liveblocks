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
    async session({ session }: { session: any }) {
      const userInfo = getUser(session.user.email);

      if (!userInfo) {
        throw new Error("User not found");
      }

      session.user.info = userInfo;
      return session;
    },
    authorized: async ({ auth }) => {
      return !!auth;
    },
    redirect: async ({ url, baseUrl }) => {
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },
  pages: {
    signIn: "/signin",
  },

  ...authConfig,
});
