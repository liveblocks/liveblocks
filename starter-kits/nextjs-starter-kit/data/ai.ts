import { User } from "@/types";

/**
 * The AI assistant's user identity. It is not part of the "real" user database
 * in data/users.ts: it can't sign in, own documents, or be invited, but it is
 * resolvable (name/avatar) so AI chats, presence, and comment replies can
 * display it.
 *
 * When `LIVEBLOCKS_WEBHOOK_SECRET_KEY` is not configured, the AI user is not
 * suggested in comment @mentions (see app/Providers.tsx), since mention-based
 * AI replies are powered by webhooks.
 */
export const AI_USER_ID = "ai-assistant";

export const aiUser: User = {
  id: AI_USER_ID,
  name: "AI Assistant",
  avatar: "https://liveblocks.io/api/avatar?u=ai-assistant&agent=true",
  color: "#b282fa",
  organizationIds: [],
};
