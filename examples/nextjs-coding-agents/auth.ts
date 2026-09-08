import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { getAccessRole } from "@/lib/server/access";

/**
 * People sign in with GitHub. Their GitHub login becomes their Liveblocks
 * user id, and their GitHub profile provides the name and avatar shown in
 * the chat. Cursor never sees these credentials: the agent runs on the
 * server's `CURSOR_API_KEY` and commits as the Cursor GitHub App.
 *
 * https://authjs.dev/getting-started/providers/github
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      authorization: {
        // `read:org` lets us check membership of GITHUB_ALLOWED_ORG and
        // list its members for @mentions; `user:email` gives us the email
        // used in `Co-authored-by` trailers.
        params: { scope: "read:user user:email read:org" },
      },
    }),
  ],
  session: { strategy: "jwt" },
  // The app is deployed behind a host you control (Vercel or your own), so
  // the request's host header can be trusted for callback URLs.
  trustHost: true,
  callbacks: {
    async jwt({ token, account, profile }) {
      // Only present on the sign-in request
      if (account && profile) {
        const login = String(profile.login);
        token.login = login;
        token.githubId = Number(profile.id);
        token.accessToken = account.access_token;
        token.role = await getAccessRole(login, account.access_token);
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.login;
      session.user.login = token.login;
      session.user.githubId = token.githubId;
      session.user.role = token.role;
      session.accessToken = token.accessToken;
      return session;
    },
  },
});
