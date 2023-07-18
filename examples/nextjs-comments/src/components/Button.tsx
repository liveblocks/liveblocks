import clsx from "clsx";
import type { ComponentPropsWithRef} from "react";
import { forwardRef } from "react";

import { Spinner } from "./Spinner";

interface ButtonProps extends ComponentPropsWithRef<"button"> {
  variant?: "primary" | "secondary";
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", isLoading, children, className, ...props },
    forwardedRef
  ) => {
    return (
      <button
        className={clsx(
          className,
          "relative flex h-9 cursor-pointer items-center rounded-md px-4 font-medium outline-none transition disabled:cursor-not-allowed disabled:opacity-50",
          {
            ["bg-blue-500 text-white enabled:hover:bg-blue-400 enabled:focus-visible:bg-blue-400"]:
              variant === "primary",
            ["bg-gray-100 enabled:hover:bg-gray-200 enabled:focus-visible:bg-gray-200"]:
              variant === "secondary",
          }
        )}
        ref={forwardedRef}
        {...props}
      >
        {isLoading && (
          <Spinner className="absolute left-1/2 h-8 w-8 -translate-x-1/2" />
        )}
        <span className={clsx("contents", isLoading && "text-transparent")}>
          {children}
        </span>
      </button>
    );
  }
);
