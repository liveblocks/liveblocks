"use client";

import type { ComponentProps, ReactNode } from "react";
import { forwardRef } from "react";

import { ChevronDownIcon } from "../../icons/ChevronDown";
import { cn } from "../../utils/cn";

export interface ButtonProps extends ComponentProps<"button"> {
  variant?:
    | "default"
    | "toolbar"
    | "outline"
    | "ghost"
    | "primary"
    | "secondary"
    | "destructive";
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
        className={cn(
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

export const SelectButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ icon, children, className, ...props }, forwardedRef) => {
    return (
      <CustomButton
        {...props}
        type="button"
        className={cn("lb-select-button", className)}
        ref={forwardedRef}
      >
        {icon ? <span className="lb-icon-container">{icon}</span> : null}
        {children ? <span className="lb-button-label">{children}</span> : null}
        <span className="lb-select-button-chevron">
          <ChevronDownIcon />
        </span>
      </CustomButton>
    );
  }
);
