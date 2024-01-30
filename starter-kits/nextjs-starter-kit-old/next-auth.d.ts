import { User } from "./types";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      // The type of extra info taken from your database and sent to front end from auth endpoint
      // See /pages/api/auth/[...nextauth].ts
      info: User;
    };
  }
}
