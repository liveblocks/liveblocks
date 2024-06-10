import { useUser } from "@liveblocks/react/suspense";
import { ComponentProps } from "react";

interface UserProps extends ComponentProps<"span"> {
  userId: string;
}

export function User({ userId, className, ...props }: UserProps) {
  const { user } = useUser(userId);

  return <span {...props}>{user?.name ?? userId}</span>;
}
