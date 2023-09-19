import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY;

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  secret: process.env.JWT_SECRET,
};

export default NextAuth(authOptions);
