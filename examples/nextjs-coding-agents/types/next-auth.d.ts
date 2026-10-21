import type { AccessRole } from "@/lib/types";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** GitHub login, also used as the Liveblocks user id */
      id: string;
      login: string;
      githubId: number;
      role: AccessRole;
    } & DefaultSession["user"];
    /** The person's GitHub token, used server-side for org member lookups */
    accessToken?: string;
  }
}

// `next-auth/jwt` re-exports this module wholesale, so the augmentation has
// to target the original for TypeScript to merge it.
declare module "@auth/core/jwt" {
  interface JWT {
    login: string;
    githubId: number;
    role: AccessRole;
    accessToken?: string;
  }
}
