import { useUser } from "@liveblocks/react";
import { useOverrides } from "@liveblocks/react-ui";
import type { HTMLAttributes } from "react";
import { forwardRef } from "react";

import { classNames } from "../classnames";

export interface UserProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  userId: string;
}

export const User = forwardRef<HTMLSpanElement, UserProps>(
  function User(props, forwardedRef) {
    const { userId, className, ...spanProps } = props;

    const { user, isLoading } = useUser(userId);
    const $ = useOverrides();

    const name =
      user === undefined || user === null ? $.USER_UNKNOWN : user.name;

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
