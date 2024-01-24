"use client";

import clsx from "clsx";
import { useCookies } from "react-cookie";
import { useHydrated } from "../utils/use-hydrated";
import { ComponentProps, useMemo } from "react";
import { getUserIndexFromUserId } from "../utils/ids";

export function UserAvatar({ className, ...props }: ComponentProps<"div">) {
  const isHydrated = useHydrated();
  const [cookies] = useCookies<"userId", { userId: string }>(["userId"]);
  const src = useMemo(() => {
    if (!cookies.userId) {
      return undefined;
    }

    const userIndex = getUserIndexFromUserId(cookies.userId);

    return userIndex !== undefined
      ? `https://liveblocks.io/avatars/avatar-${userIndex}.png`
      : undefined;
  }, [cookies]);

  return (
    <div className={clsx(className, "avatar")} {...props}>
      {isHydrated && src ? (
        <img src={src} alt="Avatar of the current user" />
      ) : null}
    </div>
  );
}
