import { useUser } from "@liveblocks/react/suspense";
import { ComponentProps } from "react";

interface AvatarProps extends ComponentProps<"img"> {
  userId: string;
}

export function Avatar({ userId, className, ...props }: AvatarProps) {
  const { user } = useUser(userId);

  return <img src={user.avatar} alt={user.name} {...props} />;
}
