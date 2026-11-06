"use client";

import { useOthers } from "@liveblocks/react/suspense";

export function useTypingLabel(channelId: string) {
  const typingOthers = useOthers((others) =>
    others.filter((other) => other.presence.typingIn === channelId)
  );

  const names = [...new Set(typingOthers.map((other) => other.info.name))];

  if (names.length === 1) {
    return `${names[0]} is typing…`;
  }
  if (names.length === 2) {
    return `${names[0]} and ${names[1]} are typing…`;
  }
  if (names.length > 2) {
    return "Several people are typing…";
  }

  return null;
}
