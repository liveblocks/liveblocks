"use client";

import { shallow } from "@liveblocks/client";
import { useOthers } from "@liveblocks/react/suspense";
import { cn } from "@/lib/utils";

/**
 * Returns the other users who currently have `postId` open in the composer.
 * Read from the project room's presence, so the calendar can show who's
 * working on each post without joining every post room.
 */
export function usePostEditors(postId: string) {
  return useOthers(
    (others) =>
      others
        .filter((other) => other.presence.editingPostId === postId)
        .map((other) => ({
          connectionId: other.connectionId,
          name: other.info.name,
          avatar: other.info.avatar,
          color: other.info.color,
        })),
    shallow
  );
}

export function EditingAvatars({
  postId,
  size = 20,
  max = 3,
  className,
}: {
  postId: string;
  size?: number;
  max?: number;
  className?: string;
}) {
  const editors = usePostEditors(postId);

  if (editors.length === 0) {
    return null;
  }

  const visible = editors.slice(0, max);
  const overflow = editors.length - visible.length;

  return (
    <div
      className={cn("flex items-center", className)}
      aria-label={`Being edited by ${editors.map((e) => e.name).join(", ")}`}
    >
      {visible.map((editor, index) => (
        <img
          key={editor.connectionId}
          src={editor.avatar}
          alt={editor.name}
          title={`${editor.name} is editing`}
          width={size}
          height={size}
          className="rounded-full bg-neutral-100 ring-2 ring-white"
          style={{
            width: size,
            height: size,
            marginLeft: index === 0 ? 0 : -size * 0.3,
            boxShadow: `0 0 0 2px #fff, 0 0 0 3.5px ${editor.color}`,
          }}
        />
      ))}
      {overflow > 0 ? (
        <span
          className="flex items-center justify-center rounded-full bg-neutral-200 text-[10px] font-medium text-neutral-700 ring-2 ring-white"
          style={{ width: size, height: size, marginLeft: -size * 0.3 }}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
