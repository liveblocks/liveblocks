"use client";

import type { ComponentProps, ReactNode } from "react";
import React, { forwardRef } from "react";

import { classNames } from "../../utils/class-names";

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: "default" | "toolbar" | "outline" | "primary" | "secondary";
  size?: "default" | "large";
  disableable?: boolean;
  icon?: ReactNode;
}

export const CustomButton = forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, "icon">
>(
  (
    {
      variant = "default",
      size = "default",
      disableable = true,
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
        {children}
      </button>
    );
  }
);

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ icon, children, ...props }, forwardedRef) => {
    return (
      <CustomButton {...props} ref={forwardedRef}>
        {icon ? <span className="lb-icon-container">{icon}</span> : null}
        {children ? <span className="lb-button-label">{children}</span> : null}
      </CustomButton>
    );
  }
);
