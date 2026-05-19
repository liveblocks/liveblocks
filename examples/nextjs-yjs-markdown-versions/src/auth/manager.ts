import NextAuth from "next-auth";

import { authConfig } from "./config";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async jwt({ token, profile, account }) {
      if (account && profile) {
        token.githubLogin = (profile as { login?: string }).login;
        token.githubId = (profile as { id?: number }).id?.toString();
      }
      return token;
    },
    async session({ session, token }) {
      if (token.githubLogin && typeof token.githubLogin === "string") {
        session.user.githubLogin = token.githubLogin;
      }
      if (token.githubId && typeof token.githubId === "string") {
        session.user.githubId = token.githubId;
      }
      return session;
    },
    authorized: async ({ auth }) => {
      return !!auth;
    },
    redirect: async ({ url, baseUrl }) => {
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },
  ...authConfig,
});
