import { useUser } from "@liveblocks/react/suspense";
import clsx from "clsx";
import React, { ComponentProps } from "react";

interface UserProps extends ComponentProps<"span"> {
  userId: string;
}

export function User({ userId, className, ...props }: UserProps) {
  const { user } = useUser(userId);

  return (
    <span className={clsx(className, "")} {...props}>
      {user?.name ?? userId}
    </span>
  );
}
