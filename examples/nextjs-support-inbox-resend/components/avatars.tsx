"use client";

import { shallow, useOthers, useSelf, useUser } from "@liveblocks/react";
import { UserRoundIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { avatarTone, initials } from "@/lib/format";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

type Size = "xs" | "sm" | "md" | "lg";

const SIZE: Record<Size, string> = {
  xs: "size-4 text-[8px]",
  sm: "size-5 text-[9px]",
  md: "size-6 text-[10px]",
  lg: "size-9 text-xs",
};

// Presence dot sizes, matched to the avatar size.
const DOT: Record<Size, string> = {
  xs: "size-[5px] ring-1",
  sm: "size-1.5 ring-1",
  md: "size-1.5 ring-[1.5px]",
  lg: "size-2 ring-[1.5px]",
};

/**
 * Avatar for a support agent, resolved through `resolveUsers`, with a presence
 * dot at the bottom right while they're connected to this workspace (they
 * appear in the room's presence).
 */
export function AgentAvatar({
  userId,
  size = "md",
  ring = "ring-surface",
  className,
}: {
  userId: string;
  size?: Size;
  // Color of the gap around the presence dot; match the background behind it.
  ring?: "ring-surface" | "ring-canvas";
  className?: string;
}) {
  const { user } = useUser(userId);
  const name = user?.name ?? "";
  const isSelf = useSelf((self) => self.id === userId) ?? false;
  const isOther = useOthers((others) =>
    others.some((other) => other.id === userId)
  );
  const online = isSelf || isOther;

  return (
    <span
      className={cn("relative inline-flex shrink-0", className)}
      title={name ? `${name} · ${online ? "online" : "offline"}` : undefined}
    >
      {user?.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatar}
          alt={name}
          className={cn("rounded-full bg-hover object-cover", SIZE[size])}
        />
      ) : (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-hover font-medium text-ink-muted",
            SIZE[size]
          )}
          aria-label={name}
        >
          {name ? initials(name) : ""}
        </span>
      )}
      {online ? (
        <span
          className={cn(
            "absolute -right-px -bottom-px rounded-full bg-done",
            DOT[size],
            ring
          )}
          aria-hidden
        />
      ) : null}
    </span>
  );
}

export function AgentName({ userId }: { userId: string }) {
  const { user } = useUser(userId);
  return <>{user?.name ?? "…"}</>;
}

// Customers don't have accounts, so they get a quiet initials avatar.
export function CustomerAvatar({
  name,
  email,
  size = "md",
  className,
}: {
  name: string;
  email: string;
  size?: Size;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold tracking-wide",
        SIZE[size],
        avatarTone(email || name),
        className
      )}
      aria-hidden
    >
      {initials(name || email)}
    </span>
  );
}

/**
 * Compact "N viewing" count for list cards: how many other teammates have the
 * conversation open right now (live, via presence). Renders nothing when no
 * one else is reading it.
 */
export function ViewerCount({
  feedId,
  className,
}: {
  feedId: string;
  className?: string;
}) {
  const { count, latestTypingAt } = useOthers((others) => {
    const ids = new Set<string>();
    let latestTypingAt = 0;
    for (const other of others) {
      if (other.presence.viewingFeedId !== feedId) continue;
      ids.add(other.id);
      latestTypingAt = Math.max(latestTypingAt, other.presence.typingAt ?? 0);
    }
    return { count: ids.size, latestTypingAt };
  }, shallow);
  const typing = useIsRecent(latestTypingAt, TYPING_WINDOW);

  if (count === 0) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs text-ink-muted",
        className
      )}
    >
      <UserRoundIcon className="size-3.5" />
      <span className="tabular">
        {count} {typing ? "typing" : "viewing"}
      </span>
    </span>
  );
}

const TYPING_WINDOW = 10_000;

// True while `timestamp` is less than `window` ms old; flips back to false on
// its own once it expires, without anyone having to re-render us.
function useIsRecent(timestamp: number, window: number) {
  const [, rerender] = useState(0);
  const remaining = timestamp + window - Date.now();
  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => rerender((n) => n + 1), remaining);
    return () => clearTimeout(timer);
  }, [remaining]);
  return remaining > 0;
}

/**
 * Live avatars of the teammates currently reading a conversation, from
 * presence. Each connected agent sets `viewingFeedId` to the conversation they
 * have open, so this updates instantly as people move around the inbox.
 */
export function ViewerAvatars({
  feedId,
  size = "md",
  max = 4,
  ring = "ring-surface",
  className,
}: {
  feedId: string;
  size?: Size;
  max?: number;
  // Ring color separating stacked avatars; match the background they sit on.
  ring?: "ring-surface" | "ring-canvas";
  className?: string;
}) {
  const viewerIds = useOthers((others) => {
    const ids: string[] = [];
    for (const other of others) {
      if (other.presence.viewingFeedId === feedId && !ids.includes(other.id)) {
        ids.push(other.id);
      }
    }
    return ids;
  }, shallow);
  const ids = viewerIds;

  if (ids.length === 0) {
    return null;
  }

  const visible = ids.slice(0, max);
  const overflow = ids.length - visible.length;

  return (
    <div className={cn("flex items-center -space-x-1.5", className)}>
      {visible.map((userId) => (
        <Tooltip key={userId}>
          <TooltipTrigger asChild>
            <span className={cn("flex rounded-full ring-2", ring)}>
              <AgentAvatar userId={userId} size={size} />
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            <ViewerLabel userId={userId} />
          </TooltipContent>
        </Tooltip>
      ))}
      {overflow > 0 ? (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-hover font-medium text-ink-muted ring-2",
            ring,
            SIZE[size]
          )}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}

function ViewerLabel({ userId }: { userId: string }) {
  const { user } = useUser(userId);
  return <>{user?.name ?? "Teammate"} · viewing</>;
}
