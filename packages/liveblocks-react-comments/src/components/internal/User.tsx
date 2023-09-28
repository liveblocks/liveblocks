"use client";

import { useRoomContextBundle } from "@liveblocks/react";
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
  const { useUser, useSelf } = useRoomContextBundle();
  const { user, isLoading } = useUser(userId);
  const self = useSelf();
  const $ = useOverrides();
  const resolvedUserName = useMemo(() => {
    const name =
      replaceSelf && self?.id === userId
        ? $.SELF
        : user?.name ?? $.UNKNOWN_USER;

    return shouldCapitalize ? capitalize(name) : name;
  }, [
    $.SELF,
    $.UNKNOWN_USER,
    shouldCapitalize,
    replaceSelf,
    self?.id,
    user?.name,
    userId,
  ]);

  return (
    <span
      className={classNames("lb-user", className)}
      data-loading={isLoading ? "" : undefined}
      {...props}
    >
      {isLoading ? null : resolvedUserName}
    </span>
  );
}
