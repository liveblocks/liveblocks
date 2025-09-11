"use client";

import { useGroupInfo } from "@liveblocks/react";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../../utils/cn";

interface GroupDescriptionProps extends ComponentPropsWithoutRef<"span"> {
  /**
   * The group ID to display the group description for.
   */
  groupId: string;
}

export function GroupDescription({
  groupId,
  className,
  ...props
}: GroupDescriptionProps) {
  const { info } = useGroupInfo(groupId);

  return info?.description ? (
    <span className={cn("lb-group-description", className)} {...props}>
      {info.description}
    </span>
  ) : null;
}
