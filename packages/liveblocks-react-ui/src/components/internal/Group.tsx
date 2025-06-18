"use client";

import { useGroupInfo } from "@liveblocks/react";
import type { ComponentProps } from "react";

import { classNames } from "../../utils/class-names";

export interface GroupProps extends ComponentProps<"span"> {
  /**
   * The group ID to display the group name for.
   */
  groupId: string;
}

export function Group({ groupId, className, ...props }: GroupProps) {
  const { info, isLoading } = useGroupInfo(groupId);

  return (
    <span
      className={classNames("lb-name lb-group", className)}
      data-loading={isLoading ? "" : undefined}
      {...props}
    >
      {isLoading ? null : (info?.name ?? groupId)}
    </span>
  );
}
