import { User } from "./types";

declare module "next-auth" {
  interface Session {
    user: {
      info: User;
    };
  }
}
