"use client";

import { kInternal } from "@liveblocks/core";
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
  replaceSelf,
  capitalize: shouldCapitalize,
  className,
  ...props
}: UserProps) {
  const {
    useUser,
    [kInternal]: { useCurrentUserId },
  } = useSharedContextBundle();
  const currentId = useCurrentUserId();
  const { user, isLoading } = useUser(userId);
  const $ = useOverrides();
  const resolvedUserName = useMemo(() => {
    const name =
      replaceSelf && currentId === userId
        ? $.USER_SELF
        : user?.name ?? $.USER_UNKNOWN;

    return shouldCapitalize ? capitalize(name) : name;
  }, [
    replaceSelf,
    currentId,
    userId,
    $.USER_SELF,
    $.USER_UNKNOWN,
    user?.name,
    shouldCapitalize,
  ]);

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
