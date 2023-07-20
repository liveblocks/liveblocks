import type { ComponentProps } from "react";
import React, { useMemo } from "react";

import { useCommentsContext } from "../factory";

export interface NameProps extends ComponentProps<"span"> {
  userId: string;
}

// TODO: Handle loading and error states
export function Name({ userId, ...props }: NameProps) {
  const {
    suspense: { useUser },
  } = useCommentsContext();
  const { user } = useUser(userId);
  const resolvedUserName = useMemo(() => user?.name, [user]);

  return <span {...props}>{resolvedUserName}</span>;
}
