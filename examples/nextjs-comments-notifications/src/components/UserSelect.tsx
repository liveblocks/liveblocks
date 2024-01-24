"use client";

import clsx from "clsx";
import { useSearchParams } from "next/navigation";
import { ChangeEvent, ComponentProps, useCallback, useEffect } from "react";
import { useCookies } from "react-cookie";
import { useHydrated } from "../utils/use-hydrated";
import { getRoomIdFromUserId, getUserId } from "../utils/ids";

interface UserSelectProps extends ComponentProps<"select"> {
  users: string[];
}

export function UserSelect({ users, className, ...props }: UserSelectProps) {
  const isHydrated = useHydrated();
  const [cookies, setCookie] = useCookies<"userId", { userId: string }>([
    "userId",
  ]);
  const params = useSearchParams();
  const roomIdParam = params?.get("roomId");

  useEffect(() => {
    const roomIdFromUserId = getRoomIdFromUserId(cookies.userId);
    const roomIdHasChanged =
      roomIdParam === null
        ? roomIdFromUserId !== undefined
        : roomIdParam !== roomIdFromUserId;

    // If there's no userId cookie or the roomId parameter has changed, set a default userId cookie.
    if (!cookies.userId || roomIdHasChanged) {
      setCookie("userId", getUserId(0, roomIdParam));
    }
  }, [cookies, roomIdParam]);

  const handleChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    const userId = event.currentTarget.value;

    setCookie("userId", userId);
    location.reload();
  }, []);

  return isHydrated && cookies.userId ? (
    <select
      className={clsx(className, "select")}
      onChange={handleChange}
      value={cookies.userId}
      {...props}
    >
      {users.map((user, index) => {
        const userId = getUserId(index, roomIdParam);

        return (
          <option key={userId} value={userId}>
            {user}
          </option>
        );
      })}
    </select>
  ) : null;
}
