"use client";

import { useGroupInfo } from "@liveblocks/react";
import type { ComponentProps } from "react";

import { cn } from "../../utils/cn";

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
      className={cn("lb-name lb-group", className)}
      data-loading={isLoading ? "" : undefined}
      {...props}
    >
      {isLoading ? null : (info?.name ?? groupId)}
    </span>
  );
}
