import { createClient } from "@liveblocks/client";
import { createCommentsContext } from "@liveblocks/react-comments";

import type { ThreadMetadata, UserMeta } from "./liveblocks.config";
import { client, resolveUser } from "./liveblocks.config";

export const {
  suspense: { useThreads, useUser },
  createComment,
  createThread,
  deleteComment,
  editComment,
  editThread,
} = createCommentsContext<ThreadMetadata, UserMeta>(client, {
  resolveUser,
  serverEndpoint: `https://${process.env.NEXT_PUBLIC_WORKERS_ENDPOINT}/v2`,
});
