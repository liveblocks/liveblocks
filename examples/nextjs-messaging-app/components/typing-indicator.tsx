"use client";

import { useOthers } from "@liveblocks/react/suspense";

export function TypingIndicator({ channelId }: { channelId: string }) {
  const typingOthers = useOthers((others) =>
    others.filter((other) => other.presence.typingIn === channelId)
  );

  const names = [...new Set(typingOthers.map((other) => other.info.name))];

  let label = "";
  if (names.length === 1) {
    label = `${names[0]} is typing…`;
  } else if (names.length === 2) {
    label = `${names[0]} and ${names[1]} are typing…`;
  } else if (names.length > 2) {
    label = "Several people are typing…";
  }

  // Fixed height so the layout doesn't jump when the label appears.
  return (
    <div className="h-5 shrink-0 px-4 text-xs text-neutral-500" aria-live="polite">
      {label}
    </div>
  );
}
