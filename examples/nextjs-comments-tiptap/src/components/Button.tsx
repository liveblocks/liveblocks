import { ComponentProps, forwardRef } from "react";
import clsx from "clsx";

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: "primary" | "secondary" | "destructive" | "subtle";
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ icon, children, variant = "primary", className, ...props }, ref) => {
    const baseClasses =
      "flex h-13 px-7 rounded-sm place-items-center transition-all duration-150 ease-in-out outline-none disabled:cursor-default disabled:opacity-50";
    const iconOnlyClasses = "w-13 px-0 place-content-center";

    const variantClasses = {
      primary:
        "bg-accent text-surface-elevated hover:opacity-80 focus-visible:opacity-80",
      destructive:
        "bg-red text-surface-elevated hover:opacity-80 focus-visible:opacity-80",
      secondary:
        "bg-surface text-text-light hover:bg-surface-hover hover:text-text focus-visible:bg-surface-hover focus-visible:text-text",
      subtle:
        "text-text-lighter hover:bg-surface hover:text-text-light focus-visible:bg-surface focus-visible:text-text-light data-[active]:bg-surface data-[active]:text-text-light",
    };

    return (
      <button
        className={clsx(
          baseClasses,
          variantClasses[variant],
          {
            [iconOnlyClasses]: !children,
          },
          className
        )}
        ref={ref}
        {...props}
      >
        {icon ? icon : null}
        {children ? (
          <span className="text-sm font-medium">{children}</span>
        ) : null}
      </button>
    );
  }
);
