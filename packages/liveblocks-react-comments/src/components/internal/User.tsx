"use client";

import { useSharedContextBundle } from "@liveblocks/react";
import type { ComponentProps } from "react";
import React, { useMemo } from "react";

import { useOverrides } from "../../overrides";
import { capitalize } from "../../utils/capitalize";
import { classNames } from "../../utils/class-names";

export interface UserProps extends ComponentProps<"span"> {
  userId: string;
  replaceSelf?: boolean;
  capitalize?: boolean;
}

export function User({
  userId,
  replaceSelf: _replaceSelf,
  capitalize: shouldCapitalize,
  className,
  ...props
}: UserProps) {
  // [comments-unread] TODO: Bring back `replaceSelf` option by adding `useSelf` hook to `useSharedContextBundle`
  // const { useUser, useSelf } = useRoomContextBundle();
  // const { user, isLoading } = useUser(userId);
  // const self = useSelf();
  // const $ = useOverrides();
  // const resolvedUserName = useMemo(() => {
  //   const name =
  //     replaceSelf && self?.id === userId
  //       ? $.USER_SELF
  //       : user?.name ?? $.USER_UNKNOWN;

  //   return shouldCapitalize ? capitalize(name) : name;
  // }, [
  //   $.USER_SELF,
  //   $.USER_UNKNOWN,
  //   shouldCapitalize,
  //   replaceSelf,
  //   self?.id,
  //   user?.name,
  //   userId,
  // ]);

  const { useUser } = useSharedContextBundle();
  const { user, isLoading } = useUser(userId);
  const $ = useOverrides();
  const resolvedUserName = useMemo(() => {
    const name = user?.name ?? $.USER_UNKNOWN;

    return shouldCapitalize ? capitalize(name) : name;
  }, [$.USER_UNKNOWN, shouldCapitalize, user?.name]);

  return (
    <span
      className={classNames("lb-name lb-user", className)}
      data-loading={isLoading ? "" : undefined}
      {...props}
    >
      {isLoading ? null : resolvedUserName}
    </span>
  );
}
