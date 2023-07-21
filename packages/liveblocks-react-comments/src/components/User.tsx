import type { ComponentProps } from "react";
import React, { useMemo } from "react";

import { useCommentsContext } from "../factory";

export interface UserProps extends ComponentProps<"span"> {
  userId: string;
}

export function User({ userId, ...props }: UserProps) {
  const { useUser } = useCommentsContext();
  const { user } = useUser(userId);
  const resolvedUserName = useMemo(() => user?.name, [user]);

  return <span {...props}>{resolvedUserName ?? userId}</span>;
}
