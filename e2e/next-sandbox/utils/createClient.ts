import { createClient } from "@liveblocks/client";

export default function createLiveblocksClient() {
  return createClient({
    authEndpoint: "/api/auth/legacy-token",
    liveblocksServer: process.env.NEXT_PUBLIC_LIVEBLOCKS_SERVER,
  } as any);
}
