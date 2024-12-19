import { useUser } from "@liveblocks/react";
import type { HTMLAttributes } from "react";
import { forwardRef } from "react";

import { classNames } from "../classnames";

export interface AvatarProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  userId: string;
}

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(
  function Avatar(props, forwardedRef) {
    const { userId, className, ...spanProps } = props;

    const { user, isLoading } = useUser(userId);

    const avatar = user ? user.avatar : undefined;

    const name = user ? user.name : undefined;

    function Initials() {
      const initials = name ? getInitials(name) : undefined;
      if (initials) {
        return (
          <span aria-hidden className="lb-avatar-fallback">
            {initials}
          </span>
        );
      }

      if (isLoading) return null;

      if (user === undefined) return null;

      return (
        <span aria-label={userId} title={userId} className="lb-avatar-fallback">
          {getInitials(userId)}
        </span>
      );
    }

    return (
      <span
        data-loading={isLoading ? "" : undefined}
        {...spanProps}
        className={classNames("lb-avatar", className)}
        ref={forwardedRef}
      >
        {avatar && <img src={avatar} alt={name} className="lb-avatar-image" />}

        <Initials />
      </span>
    );
  }
);

function getInitials(name: string) {
  return name
    .trim()
    .split(" ")
    .reduce((initials, name, index, array) => {
      if (index === 0 || index === array.length - 1) {
        initials += name.charAt(0).toLocaleUpperCase();
      }

      return initials;
    }, "");
}
