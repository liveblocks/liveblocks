// The coding agent, shown with its own avatar in the chat. It never signs
// in; its messages are written server-side via `@liveblocks/node`.
export const AI_USER_ID = "ai-assistant";

export const AI_USER: Liveblocks["UserMeta"] = {
  id: AI_USER_ID,
  info: {
    name: "Agent",
    color: "#8B85FF",
    avatar: "https://liveblocks.io/api/avatar?u=ai-assistant&agent=true",
  },
};

const COLORS = [
  "#D583F0",
  "#F08385",
  "#F0D885",
  "#85EED6",
  "#87EE85",
  "#8594F0",
  "#F0A285",
  "#85BBF0",
];

/** Stable presence color derived from a user id. */
export function getUserColor(userId: string) {
  let hash = 0;
  for (const char of userId) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}
