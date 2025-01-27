import type { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { getUser } from "@/lib/database";

export const authConfig: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {
          label: "email",
          type: "text",
        },
      },
      authorize: async (credentials) => {
        if (!credentials || typeof credentials.email !== "string") {
          throw new Error("No credentials or email");
        }

        const user = getUser(credentials.email);

        if (!user) {
          throw new Error("User not found");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.id,
          image: user.picture,
        };
      },
    }),
  ],

  trustHost: true,
};
