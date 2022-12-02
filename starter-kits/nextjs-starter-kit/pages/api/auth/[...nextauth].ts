import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";
// import Auth0Provider from "next-auth/providers/auth0";
import { getUser } from "../../../lib/server";
import { User } from "../../../types";

export const authOptions = {
  callbacks: {
    // Get extra user info from your database to pass to front-end
    // For front end, update next-auth.d.ts with session type
    async session({ session }: { session: any }) {
      const userInfo: User | null = await getUser(session.user.email);

      if (!userInfo) {
        return null;
      }

      session.user.info = userInfo;
      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },

  // Configure one or more authentication providers
  // More info: https://next-auth.js.org/providers/
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    }),
    /*
    Auth0Provider({
      clientId: process.env.AUTH0_CLIENT_ID as string,
      clientSecret: process.env.AUTH0_CLIENT_SECRET as string,
      issuer: process.env.AUTH0_ISSUER_BASE_URL,
    }),
    */
    // ...add more providers here
  ],

  /*
  // Uncomment this block if you're using `Auth0Provider`
  jwt: {
    signingKey: { kty: "oct", kid: "--", alg: "HS256", k: "--" },
    verificationOptions: {
      algorithms: ["HS256"],
    },
  } as any,
  */
};

export default NextAuth(authOptions);
