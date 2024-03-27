import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { getUser } from "@/lib/database/getUser";
import { User } from "@/types";

// Your NextAuth secret (generate a new one for production)
// More info: https://next-auth.js.org/configuration/options#secret
export const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;

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
    async session({ session }: { session: any }) {
      const userInfo: User | null = await getUser(session.user.email);

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

export async function getProviders() {
  try {
    const response = await fetch(`http://localhost:3000/api/auth/providers`);

    if (!response.ok) {
      throw new Error("Problem fetching providers");
    }

    return await response.json();
  } catch (err) {
    console.error(err);
  }
}
