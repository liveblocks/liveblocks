"use client";

import { shallow, useOthers, useSelf, useUser } from "@liveblocks/react";
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

// Avatar for a support agent, resolved through `resolveUsers`.
export function AgentAvatar({
  userId,
  size = "md",
  className,
}: {
  userId: string;
  size?: Size;
  className?: string;
}) {
  const { user } = useUser(userId);
  const name = user?.name ?? "";

  if (!user?.avatar) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full bg-hover font-medium text-ink-muted",
          SIZE[size],
          className
        )}
        aria-label={name}
      >
        {name ? initials(name) : ""}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={user.avatar}
      alt={name}
      title={name}
      className={cn(
        "shrink-0 rounded-full bg-hover object-cover",
        SIZE[size],
        className
      )}
    />
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
 * Live avatars of the teammates currently reading a conversation, from
 * presence. Each connected agent sets `viewingFeedId` to the conversation they
 * have open, so this updates instantly as people move around the inbox.
 */
export function ViewerAvatars({
  feedId,
  size = "md",
  max = 4,
  includeSelf = false,
  className,
}: {
  feedId: string;
  size?: Size;
  max?: number;
  includeSelf?: boolean;
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
  const selfId = useSelf((self) => self.id);
  const ids =
    includeSelf && selfId && !viewerIds.includes(selfId)
      ? [...viewerIds, selfId]
      : viewerIds;

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
            <span className="rounded-full ring-2 ring-surface">
              <AgentAvatar userId={userId} size={size} />
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            <ViewerLabel userId={userId} isSelf={userId === selfId} />
          </TooltipContent>
        </Tooltip>
      ))}
      {overflow > 0 ? (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-hover font-medium text-ink-muted ring-2 ring-surface",
            SIZE[size]
          )}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}

function ViewerLabel({ userId, isSelf }: { userId: string; isSelf: boolean }) {
  const { user } = useUser(userId);
  return <>{isSelf ? "You" : (user?.name ?? "Teammate")} · viewing</>;
}
