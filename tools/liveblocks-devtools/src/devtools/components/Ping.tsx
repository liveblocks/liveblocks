import cx from "classnames";
import type { ComponentProps } from "react";
import React from "react";

interface PingProps extends ComponentProps<"div"> {
  animate?: boolean;
}

export function Ping({ animate = true, className, ...props }: PingProps) {
  return (
    <div
      className={cx(
        className,
        "relative flex h-2 w-2 rounded-full bg-current",
        animate &&
          "before:absolute before:inset-0 before:animate-ping before:rounded-full before:bg-current before:opacity-80"
      )}
      {...props}
    />
  );
}
