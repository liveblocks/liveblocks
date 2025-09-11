import {
  assertNever,
  type AsyncResult,
  type AsyncSuccess,
  type BaseGroupInfo,
  type BaseUserMeta,
} from "@liveblocks/core";
import { useGroupInfo, useUser } from "@liveblocks/react";
import {
  useGroupInfo as useGroupInfoSuspense,
  useUser as useUserSuspense,
} from "@liveblocks/react/suspense";

import { useInitial } from "./use-initial";

type UserOrGroupInfoResult = AsyncResult<
  BaseUserMeta["info"] | BaseGroupInfo,
  "info"
>;

type UserOrGroupInfoSuccess = AsyncSuccess<
  BaseUserMeta["info"] | BaseGroupInfo,
  "info"
>;

export function useUserOrGroupInfo(
  kind: "user" | "group",
  id: string
): UserOrGroupInfoResult {
  // Switching between user IDs and group IDs is not supported
  // to support the Rules of Hooks.
  const frozenKind = useInitial(kind);

  if (frozenKind === "user") {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { user, isLoading, error } = useUser(id);

    return {
      info: user,
      isLoading,
      error,
    } as UserOrGroupInfoResult;
  } else if (frozenKind === "group") {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { info, isLoading, error } = useGroupInfo(id);

    return {
      info,
      isLoading,
      error,
    } as UserOrGroupInfoResult;
  }

  return assertNever(frozenKind, "Invalid kind");
}

export function useUserOrGroupInfoSuspense(
  kind: "user" | "group",
  id: string
): UserOrGroupInfoSuccess {
  // Switching between user IDs and group IDs is not supported
  // to support the Rules of Hooks.
  const frozenKind = useInitial(kind);

  if (frozenKind === "user") {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { user, isLoading, error } = useUserSuspense(id);

    return {
      info: user,
      isLoading,
      error,
    };
  } else if (frozenKind === "group") {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { info, isLoading, error } = useGroupInfoSuspense(id);

    return {
      info,
      isLoading,
      error,
    };
  }

  return assertNever(frozenKind, "Invalid kind");
}
