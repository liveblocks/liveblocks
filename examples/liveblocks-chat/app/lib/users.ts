/**
 * Bot user for Liveblocks comments (@mentions). ID must match LIVEBLOCKS_BOT_USER_ID / bot posts.
 * `NEXT_PUBLIC_*` is used on the client so `useOthers` can match REST `setPresence` to this user.
 */
export function getBotUserId(): string {
  return (
    process.env.NEXT_PUBLIC_LIVEBLOCKS_BOT_USER_ID ??
    process.env.LIVEBLOCKS_BOT_USER_ID ??
    "bot"
  );
}

export function getBotDisplayName(): string {
  return process.env.LIVEBLOCKS_BOT_DISPLAY_NAME ?? "Acme AI";
}

export function botUserInfo() {
  return {
    name: getBotDisplayName(),
    color: "#4f46e5",
    avatar: undefined as string | undefined,
  };
}
