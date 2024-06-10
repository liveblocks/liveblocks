import { createClient } from "@liveblocks/client";
import { Presence, Storage, UserMeta } from "./types";

const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
});

declare global {
  interface Liveblocks {
    Presence: Presence;
    Storage: Storage;
    UserMeta: UserMeta;
  }
}
