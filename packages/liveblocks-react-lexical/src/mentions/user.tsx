import { useUser } from "@liveblocks/react";
import type { HTMLAttributes } from "react";
import React, { forwardRef } from "react";

import { classNames } from "../classnames";

export interface UserProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  userId: string;
}

export const User = forwardRef<HTMLSpanElement, UserProps>(
  function User(props, forwardedRef) {
    const { userId, className, ...spanProps } = props;

    const { user, isLoading } = useUser(userId);

    const name = user === undefined || user === null ? "Anonymous" : user.name;

    return (
      <span
        data-loading={isLoading ? "" : undefined}
        {...spanProps}
        ref={forwardedRef}
        className={classNames("lb-name lb-user", className)}
      >
        {isLoading ? null : name}
      </span>
    );
  }
);
