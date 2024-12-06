"use client";

import type { ComponentProps, ReactNode } from "react";
import React, { forwardRef } from "react";

import { classNames } from "../../utils/class-names";

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: "default" | "toolbar" | "outline" | "primary";
  size?: "default" | "large";
  disableable?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "default",
      size = "default",
      disableable = true,
      icon,
      className,
      children,
      ...props
    },
    forwardedRef
  ) => {
    return (
      <button
        type="button"
        className={classNames(
          "lb-button",
          !disableable && "lb-button:non-disableable",
          className
        )}
        data-variant={variant}
        data-size={size}
        {...props}
        ref={forwardedRef}
      >
        {icon ? <span className="lb-icon-container">{icon}</span> : null}
        {children ? <span className="lb-button-label">{children}</span> : null}
      </button>
    );
  }
);
