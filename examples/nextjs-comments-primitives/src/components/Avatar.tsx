import { useUser } from "@liveblocks/react/suspense";
import clsx from "clsx";
import React, { ComponentProps } from "react";

interface AvatarProps extends ComponentProps<"div"> {
  userId: string;
}

export function Avatar({ userId, className, ...props }: AvatarProps) {
  const { user } = useUser(userId);

  return (
    <div
      className={clsx(
        className,
        "relative aspect-square overflow-hidden rounded-full bg-gray-100"
      )}
      {...props}
    >
      {user && (
        <img
          src={user?.avatar}
          alt={user?.name}
          className="absolute inset-0 object-cover"
        />
      )}
    </div>
  );
}
