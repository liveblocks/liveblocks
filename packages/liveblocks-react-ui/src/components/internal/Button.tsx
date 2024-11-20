"use client";

import type { ComponentProps } from "react";
import React, { forwardRef } from "react";

import { classNames } from "../../utils/class-names";

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: "default" | "outline" | "primary";
  size?: "default" | "large";
  disableable?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "default",
      size = "default",
      disableable = true,
      className,
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
      />
    );
  }
);
